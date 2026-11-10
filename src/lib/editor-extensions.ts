import StarterKit from "@tiptap/starter-kit";

// One extension list shared by the editor and the import converter, so imports can only
// produce formatting the editor can display. Anything else degrades to plain paragraphs.
export const documentExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2] },
    blockquote: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
    link: false,
  }),
];
