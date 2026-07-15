import { toPng } from "html-to-image";

export async function exportSlideToPng(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#faf6ee",
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export async function exportAllSlidesToPng(
  elements: HTMLElement[],
  baseName: string
): Promise<void> {
  for (let i = 0; i < elements.length; i++) {
    await exportSlideToPng(
      elements[i],
      `${baseName}-第${i + 1}頁.png`
    );
    await new Promise((r) => setTimeout(r, 300));
  }
}
