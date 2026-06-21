import type { Area } from 'react-easy-crop';

export const CARD_IMAGE_WIDTH = 1200;
export const CARD_IMAGE_HEIGHT = 628;

function loadImage(sourceUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('画像を読み込めませんでした。別の画像を選択してください。'));
    image.src = sourceUrl;
  });
}

function drawPlayMark(context: CanvasRenderingContext2D, sizePercent: number) {
  const centerX = CARD_IMAGE_WIDTH / 2;
  const centerY = CARD_IMAGE_HEIGHT / 2;
  const radius = (Math.min(CARD_IMAGE_WIDTH, CARD_IMAGE_HEIGHT) * sizePercent) / 100;

  context.save();
  context.shadowColor = 'rgba(15, 23, 42, 0.28)';
  context.shadowBlur = 18;
  context.shadowOffsetY = 5;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fillStyle = 'rgba(14, 165, 233, 0.94)';
  context.fill();
  context.shadowColor = 'transparent';
  context.lineWidth = Math.max(5, radius * 0.075);
  context.strokeStyle = '#ffffff';
  context.stroke();

  const triangleHeight = radius * 0.92;
  const triangleWidth = triangleHeight * 0.78;
  const triangleOffset = radius * 0.1;
  context.beginPath();
  context.moveTo(centerX - triangleWidth * 0.36 + triangleOffset, centerY - triangleHeight / 2);
  context.lineTo(centerX - triangleWidth * 0.36 + triangleOffset, centerY + triangleHeight / 2);
  context.lineTo(centerX + triangleWidth * 0.64 + triangleOffset, centerY);
  context.closePath();
  context.fillStyle = '#ffffff';
  context.fill();
  context.restore();
}

export async function createCardImage(
  sourceUrl: string,
  crop: Area,
  showPlayMark: boolean,
  playMarkSize: number,
  sourceFileName: string
): Promise<File> {
  const image = await loadImage(sourceUrl);
  const canvas = document.createElement('canvas');
  canvas.width = CARD_IMAGE_WIDTH;
  canvas.height = CARD_IMAGE_HEIGHT;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('画像編集機能を初期化できませんでした。');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, CARD_IMAGE_WIDTH, CARD_IMAGE_HEIGHT);
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    CARD_IMAGE_WIDTH,
    CARD_IMAGE_HEIGHT
  );
  if (showPlayMark) {
    drawPlayMark(context, playMarkSize);
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('加工済み画像を生成できませんでした。'))),
      'image/jpeg',
      0.92
    );
  });

  const baseName = sourceFileName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-') || 'card';
  return new File([blob], `${baseName}-x-card.jpg`, { type: 'image/jpeg' });
}
