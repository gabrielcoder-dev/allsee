import L from 'leaflet';

export const orangePinIcon = new L.DivIcon({
  className: 'custom-orange-marker',
  html: `
    <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="16" cy="13" rx="13" ry="13" fill="#FF6600"/>
      <path d="M16 40C16 40 29 25.5 29 16C29 7.71573 23.2843 2 16 2C8.71573 2 3 7.71573 3 16C3 25.5 16 40 16 40Z" fill="#FF6600"/>
      <ellipse cx="16" cy="16" rx="6" ry="6" fill="white" fill-opacity="0.7"/>
    </svg>
  `,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
});

export const highlightedPinIcon = new L.DivIcon({
  className: 'highlighted-marker',
  html: `
    <svg width="40" height="48" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="20" cy="15" rx="16" ry="16" fill="#FF4500"/>
      <path d="M20 48C20 48 36 30.5 36 20C36 9.71573 28.2843 2 20 2C11.7157 2 4 9.71573 4 20C4 30.5 20 48 20 48Z" fill="#FF4500"/>
      <ellipse cx="20" cy="20" rx="8" ry="8" fill="white" fill-opacity="0.8"/>
      <circle cx="20" cy="20" r="4" fill="#FF4500"/>
      <circle cx="20" cy="20" r="2" fill="white"/>
    </svg>
  `,
  iconSize: [40, 48],
  iconAnchor: [20, 48],
  popupAnchor: [0, -48],
}); 