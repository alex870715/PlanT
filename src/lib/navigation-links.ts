/** 產生各平台導航 deep link */
export function googleMapsDirectionsUrl(
  lat: number,
  lng: number,
  name?: string
): string {
  const q = name ? encodeURIComponent(name) : `${lat},${lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=&travelmode=transit&query=${q}`;
}

export function appleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`;
}

export function kakaoMapDirectionsUrl(lat: number, lng: number, name?: string): string {
  const label = encodeURIComponent(name ?? "目的地");
  return `https://map.kakao.com/link/to/${label},${lat},${lng}`;
}

export function naverMapDirectionsUrl(lat: number, lng: number, name?: string): string {
  const title = encodeURIComponent(name ?? "目的地");
  return `https://map.naver.com/v5/directions/-/-/${lng},${lat},${title},PLACE_POI/-/transit`;
}
