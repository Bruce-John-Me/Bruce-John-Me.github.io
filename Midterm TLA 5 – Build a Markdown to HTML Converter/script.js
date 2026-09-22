const mdInput = document.getElementById("markdown-input");
const htmlOutput = document.getElementById("html-output");
const preview = document.getElementById("preview");

mdInput.addEventListener("input", () => {
    const html = convertMarkdown();

    htmlOutput.innerText = html;
    preview.innerHTML = html;
});

function convertMarkdown() {
    const markdown = mdInput.value;

    let html = markdown;

    const headingRegex = /^(#{1,3})\s+(.*)$/gm;

    html = html.replace(headingRegex, (_, level, content) => {
        return `<h${level.length}>${content}</h${level.length}>`;
    });

    const boldRegex1 = /\*\*(.+?)\*\*/g;

    html = html.replace(boldRegex1, (_, content) => {
        return `<strong>${content}</strong>`;
    });

    const boldRegex2 = /__(.+?)__/g;

    html = html.replace(boldRegex2, (_, content) => {
        return `<strong>${content}</strong>`;
    });

    const italicsRegex1 = /\*(.+?)\*/g;

    html = html.replace(italicsRegex1, (_, content) => {
        return `<em>${content}</em>`;
    });

    const italicsRegex2 = /_(.+?)_/g;

    html = html.replace(italicsRegex2, (_, content) => {
        return `<em>${content}</em>`;
    });

    const imgRegex = /!\[(.+?)\]\((.+?)\)/g;

    html = html.replace(imgRegex, (_, alt, src) => {
        return `<img alt="${alt}" src="${src}">`;
    });

    const linkRegex = /\[(.+?)\]\((.+?)\)/g;

    html = html.replace(linkRegex, (_, text, href) => {
        return `<a href="${href}">${text}</a>`;
    });

    const blockquoteRegex = /^>\s+(.+)$/gm;

    html = html.replace(blockquoteRegex, (_, content) => {
        return `<blockquote>${content}</blockquote>`;
    });

    html = html.replace(/\n/g, "");

    return html;
}