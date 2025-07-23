import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMapEvents, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../lib/supabase';

// Componente para capturar clique no mapa
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const MapAdmin = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [clickCoords, setClickCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [anuncios, setAnuncios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [markers, setMarkers] = useState<any[]>([]);

  // Buscar anúncios do Supabase
  useEffect(() => {
    async function fetchAnuncios() {
      setLoading(true);
      const { data, error } = await supabase.from('anuncios').select('*');
      if (!error && data) setAnuncios(data);
      setLoading(false);
    }
    fetchAnuncios();
  }, []);

  // Buscar markers do Supabase
  useEffect(() => {
    async function fetchMarkers() {
      const { data, error } = await supabase
        .from('markers')
        .select('id, anuncio_id, lat, lng, anuncio:anuncio_id(*)')
      if (!error && data) setMarkers(data);
    }
    fetchMarkers();
  }, []);

  // Handler de clique no mapa
  const handleMapClick = (lat: number, lng: number) => {
    setClickCoords({ lat, lng });
    setModalOpen(true);
  };

  // Handler de fechar modal
  const handleCloseModal = () => {
    setModalOpen(false);
    setClickCoords(null);
  };

  // Handler para adicionar marker
  const handleAddMarker = async (anuncioId: number) => {
    if (!clickCoords) return;
    // Salva no Supabase
    const { error } = await supabase.from('markers').insert({
      anuncio_id: anuncioId,
      lat: clickCoords.lat,
      lng: clickCoords.lng,
    });
    if (error) {
      alert('Erro ao adicionar marker: ' + error.message);
      return;
    }
    setModalOpen(false);
    setClickCoords(null);
    // Atualiza markers após adicionar
    const { data, error: fetchError } = await supabase
      .from('markers')
      .select('id, anuncio_id, lat, lng, anuncio:anuncio_id(*)')
    if (!fetchError && data) setMarkers(data);
  };

  // Handler para remover marker
  const handleRemoveMarker = async (markerId: number) => {
    await supabase.from('markers').delete().eq('id', markerId);
    // Atualiza markers após remover
    const { data, error } = await supabase
      .from('markers')
      .select('id, anuncio_id, lat, lng, anuncio:anuncio_id(*)')
    if (!error && data) setMarkers(data);
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <MapContainer center={[-15.5556, -54.2811]} zoom={13} style={{ width: '100%', height: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onMapClick={handleMapClick} />
        {/* Renderizar markers */}
        {markers.map((marker: any) => (
          <Marker key={marker.id} position={[marker.lat, marker.lng]}>
            <Popup>
              <strong>{marker.anuncio?.name || marker.anuncio?.nome || marker.anuncio_id}</strong><br />
              {marker.anuncio?.adress || marker.anuncio?.endereco || ''}<br />
              Preço: {marker.anuncio?.price || ''}<br />
              Duração: {marker.anuncio?.duration || ''}<br />
              <button onClick={() => handleRemoveMarker(marker.id)} style={{ marginTop: 8, color: 'red' }}>
                Remover marker
              </button>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {/* Modal simples */}
      {modalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, minWidth: 320, maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: 16 }}>Selecione um anúncio</h2>
            {loading ? <p>Carregando anúncios...</p> : (
              <ul>
                {anuncios.map((anuncio: any) => (
                  <li key={anuncio.id} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{anuncio.name || anuncio.nome || anuncio.id}</span>
                    <button onClick={() => handleAddMarker(anuncio.id)} style={{ marginLeft: 12 }}>
                      Adicionar marker aqui
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={handleCloseModal} style={{ marginTop: 16 }}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapAdmin;
