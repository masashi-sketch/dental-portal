export function setTestPortalPreview(kind: 'clinic' | 'patient', targetId: string) {
  const payload = { v: 1, kind, targetId, actor: 'test', exp: Math.floor(Date.now() / 1000) + 900 };
  const encoded = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  window.sessionStorage.setItem('portal-preview-token', `${encoded}.test-signature`);
}

export function clearTestPortalPreview() {
  window.sessionStorage.removeItem('portal-preview-token');
}
