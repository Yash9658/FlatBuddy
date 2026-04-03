type PropertyMapEmbedProps = {
  addressLine: string;
  areaName: string;
  cityName: string;
};

const mapsEmbedKey = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY;

export function PropertyMapEmbed({ addressLine, areaName, cityName }: PropertyMapEmbedProps) {
  if (!mapsEmbedKey) {
    return null;
  }

  const query = encodeURIComponent(`${addressLine}, ${areaName}, ${cityName}`);
  const src = `https://www.google.com/maps/embed/v1/place?key=${mapsEmbedKey}&q=${query}`;

  return (
    <iframe
      title={`Map for ${addressLine}`}
      src={src}
      className="h-52 w-full rounded-2xl border border-border"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
