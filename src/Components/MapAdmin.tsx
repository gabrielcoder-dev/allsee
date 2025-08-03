"use client"

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMapEvents, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../lib/supabase';
import { orangePinIcon } from './CustomMarkerIcon';
import { X } from 'lucide-react';
import MiniAnuncioCard from './MiniAnuncioCard';
import L, { Map as MapType, LeafletEvent } from 'leaflet';

// Componente para capturar clique no mapa
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapWithRef({ mapRef, children, ...props }: any) {
  return (
    <MapContainer
      {...props}
      whenReady={(e: any) => { mapRef.current = e.target; }}
    >
      {children}
    </MapContainer>
  );
}

const MapAdmin = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [clickCoords, setClickCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [anuncios, setAnuncios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [markers, setMarkers] = useState<any[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<any | null>(null);
  const mapRef = useRef<MapType | null>(null);

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

  // Função para converter lat/lng para pixel no mapa
  function latLngToContainerPoint(lat: number, lng: number): { left: number; top: number } | null {
    if (!mapRef.current) return null;
    const map = mapRef.current;
    const point = map.latLngToContainerPoint(L.latLng(lat, lng));
    return { left: point.x, top: point.y };
  }

  // Handler para clicar no marker
  const handleMarkerClick = (marker: any) => {
    setSelectedMarker(marker);
  };

  // Handler para clicar fora do card
  useEffect(() => {
    if (!selectedMarker) return;
    function handleClickOutside(e: MouseEvent) {
      const card = document.getElementById('mini-anuncio-card-popup');
      if (card && !card.contains(e.target as Node)) {
        setSelectedMarker(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedMarker]);

  return (
    <div className="w-full h-full relative">
      <div className="absolute inset-0 z-0">
        <MapWithRef
          mapRef={mapRef}
          center={[-15.5586, -54.2811]}
          zoom={15}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onMapClick={handleMapClick} />
          {/* Renderizar markers */}
          {markers.map((marker: any) => (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={orangePinIcon}
              eventHandlers={{
                click: () => handleMarkerClick(marker),
              }}
            >
              {selectedMarker && selectedMarker.id === marker.id && (
                <Popup
                  minWidth={200}
                  maxWidth={300}
                >
                  <MiniAnuncioCard
                    anuncio={selectedMarker.anuncio}
                    hideAddButton={true}
                    actionButton={
                      <button
                        onClick={() => { handleRemoveMarker(selectedMarker.id); setSelectedMarker(null); }}
                        className="w-full text-xs text-red-600 border border-red-300 rounded px-2 py-1 hover:bg-red-50"
                      >
                        Remover marker
                      </button>
                    }
                  />
                </Popup>
              )}
            </Marker>
          ))}
        </MapWithRef>
      </div>
      {/* Modal simples */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-2 sm:p-4"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-1.5 sm:p-4 md:p-6 w-full max-w-[98vw] sm:max-w-5xl relative max-h-[98vh] sm:max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 sm:top-3 z-50 sm:right-3 cursor-pointer p-2"
              onClick={handleCloseModal}
            >
              <X />
            </button>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 pr-8 sticky top-0 bg-white z-10">Selecione um anúncio</h2>
            {loading ? <p>Carregando anúncios...</p> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 p-1 sm:p-2 overflow-y-auto flex-1 max-h-[70vh] sm:max-h-[65vh]">
                {anuncios.filter((anuncio: any) => !markers.some((marker: any) => marker.anuncio_id === anuncio.id)).length === 0 ? (
                  <div className="col-span-full text-center text-gray-500 text-lg font-semibold py-12">
                    Não há totens ou todos estão adicionados
                  </div>
                ) : (
                  anuncios
                    .filter((anuncio: any) => !markers.some((marker: any) => marker.anuncio_id === anuncio.id))
                    .map((anuncio: any) => (
                      <div
                        key={anuncio.id}
                        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2 sm:p-3 flex flex-col gap-1 w-full max-w-full sm:max-w-xl h-[400px] sm:h-[440px] transition-all hover:shadow-xl"
                      >
                        <div className="rounded-lg overflow-hidden h-28 sm:h-32 flex items-center justify-center bg-gray-100 mb-2">
                          <img
                            src={anuncio.image}
                            alt={anuncio.name || anuncio.nome}
                            className="object-cover w-full h-28 sm:h-32"
                          />
                        </div>
                        <div className="flex gap-2 mb-2">
                          {anuncio.type_screen?.toLowerCase() === 'impresso' ? (
                            <span className="bg-green-600 text-white text-xs px-2 py-1 rounded font-medium flex items-center gap-1">
                              impresso
                            </span>
                          ) : (
                            <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded font-medium flex items-center gap-1">
                              digital
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-base sm:text-lg line-clamp-2">{anuncio.name || anuncio.nome}</h3>
                        <div className="text-gray-500 text-xs mb-1 break-words">{anuncio.address || anuncio.adress || anuncio.endereco}</div>
                        <div className="flex gap-4 sm:gap-8 mb-1">
                          <div className="flex flex-col items-start">
                            <span className="text-[10px] text-gray-500 font-medium lowercase flex items-center gap-1">exibições</span>
                            <span className="font-bold text-base">{anuncio.display || anuncio.screens || '1'}</span>
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="text-[10px] text-gray-500 font-medium lowercase flex items-center gap-1">alcance</span>
                            <span className="font-bold text-base">{anuncio.views || anuncio.alcance || '-'}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-800 mb-1 font-bold">Telas: {anuncio.screens || 1}</div>
                        <div className="text-lg font-bold mb-1 text-green-700">R$ {Number(anuncio.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        <div className="text-xs text-gray-500 mb-2">/ 2 semanas</div>
                        <button
                          className="w-full cursor-pointer flex items-center justify-center gap-4 border rounded-lg py-2 text-base font-semibold transition border-green-400 text-green-600 hover:bg-green-50 mt-auto"
                          onClick={() => handleAddMarker(anuncio.id)}
                        >
                          adicionar marker
                        </button>
                      </div>
                    ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapAdmin;
