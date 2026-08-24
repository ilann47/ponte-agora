import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: 'center',
        background: '#09231b',
        color: '#f5f0df',
        display: 'flex',
        fontSize: 14,
        fontWeight: 800,
        height: '100%',
        justifyContent: 'center',
        letterSpacing: '-0.5px',
        width: '100%',
      }}
    >
      PA
    </div>,
    size,
  );
}
