import { assertExists } from '@blocksuite/global/utils';
import type { BaseBlockModel, Page } from '@blocksuite/store';

export const createImageInputElement = () => {
  const fileInput: HTMLInputElement = document.createElement('input');
  fileInput.type = 'file';
  fileInput.multiple = true;
  fileInput.accept = 'image/*';
  fileInput.style.position = 'fixed';
  fileInput.style.left = '0';
  fileInput.style.top = '0';
  fileInput.style.opacity = '0.001';
  return fileInput;
};

type Props = Partial<BaseBlockModel>;

export const uploadImageFromLocal = async (
  page: Page,
  getSize?: (size: { width: number; height: number }) => void
): Promise<Array<Props>> => {
  const baseProps: Props = { flavour: 'affine:embed', type: 'image' };
  const fileInput = createImageInputElement();
  document.body.appendChild(fileInput);

  let resolvePromise: (value: Array<Props> | PromiseLike<Array<Props>>) => void;
  const pending = new Promise<Array<Props>>(resolve => {
    resolvePromise = resolve;
  });
  const onChange = async () => {
    if (!fileInput.files) return;
    const storage = page.blobs;
    assertExists(storage);

    const files = fileInput.files;
    const res = [];
    const maxImageSize = { width: 0, height: 0 };
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = await storage.set(file);
      res.push({ ...baseProps, sourceId: id });
      if (getSize) {
        const size = await readImageSize(file);
        maxImageSize.width = Math.max(maxImageSize.width, size.width);
        maxImageSize.height = Math.max(maxImageSize.height, size.height);
      }
    }
    // When edgeless mode, update the options by max image size
    if (getSize) {
      getSize(maxImageSize);
    }

    resolvePromise(res);
    fileInput.removeEventListener('change', onChange);
    fileInput.remove();
  };

  fileInput.addEventListener('change', onChange);
  fileInput.click();
  return await pending;
};

function readImageSize(file: File) {
  return new Promise<{ width: number; height: number }>(resolve => {
    let width = 0;
    let height = 0;
    let reader: FileReader | null = new FileReader();
    reader.addEventListener('load', _ => {
      const img = new Image();
      img.onload = () => {
        width = img.width;
        height = img.height;
        reader = null;
        resolve({ width, height });
      };
      img.src = reader?.result as string;
    });
    reader.addEventListener('error', _ => {
      reader = null;
      resolve({ width, height });
    });
    reader.readAsDataURL(file);
  });
}
