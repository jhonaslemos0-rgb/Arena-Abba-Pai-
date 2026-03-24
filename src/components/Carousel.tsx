import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useData } from '../contexts/DataContext';

export default function Carousel() {
  const { settings } = useData();
  const [currentIndex, setCurrentIndex] = useState(0);
  const banners = settings?.banners || [];

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  if (banners.length === 0) {
    return (
      <div className="w-full h-[400px] md:h-[500px] bg-zinc-900 flex items-center justify-center border-b border-white/10">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tighter">
            ARENA <span className="text-[#E10600]">ABBA PAI</span>
          </h1>
          <p className="text-gray-400 text-lg">Agende sua quadra gratuitamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[400px] md:h-[500px] overflow-hidden group">
      {banners.map((banner: any, index: number) => (
        <div
          key={banner.id || index}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          <img src={banner.imagem_url} alt={`Banner ${index + 1}`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        </div>
      ))}

      {banners.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-[#E10600] text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-[#E10600] text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {banners.map((_: any, index: number) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex ? 'bg-[#E10600] w-6' : 'bg-white/50 hover:bg-white'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
