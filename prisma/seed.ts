import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const USERS = [
  { email: "alice@demo.com", name: "Alice" },
  { email: "bob@demo.com", name: "Bob" },
  { email: "carol@demo.com", name: "Carol" },
];

const WELCOME_TITLE = "Welcome to Ajaia Docs";

const welcomeContent = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: WELCOME_TITLE }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "This document is owned by Alice and shared with Bob as an " },
        { type: "text", marks: [{ type: "bold" }], text: "Editor" },
        { type: "text", text: "." },
      ],
    },
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Try it out" }] },
    {
      type: "bulletList",
      content: [
        "Format text with the toolbar or Ctrl/Cmd+B, I, U.",
        "Share a document from the Share button.",
        "Import a .txt or .md file from the dashboard.",
      ].map((text) => ({
        type: "listItem",
        content: [{ type: "paragraph", content: [{ type: "text", text }] }],
      })),
    },
  ],
};

async function main() {
  const users = await Promise.all(
    USERS.map((u) =>
      db.user.upsert({ where: { email: u.email }, update: { name: u.name }, create: u }),
    ),
  );
  const [alice, bob] = users;

  const existing = await db.document.findFirst({
    where: { ownerId: alice.id, title: WELCOME_TITLE },
  });
  const welcome =
    existing ??
    (await db.document.create({
      data: { title: WELCOME_TITLE, content: welcomeContent, ownerId: alice.id },
    }));

  await db.documentShare.upsert({
    where: { documentId_userId: { documentId: welcome.id, userId: bob.id } },
    update: { role: "EDITOR" },
    create: { documentId: welcome.id, userId: bob.id, role: "EDITOR" },
  });

  console.log(`Seeded ${users.length} users and the welcome document.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
