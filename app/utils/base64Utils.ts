// Base64 인코딩/디코딩 유틸리티 함수들

export function EncodeBase64(v: string): string {
  if (v === undefined || v === null || v.length < 1) {
    return v;
  }
  return Buffer.from(v, "utf8").toString("base64");
}

export function DecodeBase64(v: string): string {
  if (v === undefined || v === null || v.length < 1) {
    return v;
  }
  return Buffer.from(v, "base64").toString("utf-8");
}
