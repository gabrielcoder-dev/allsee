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