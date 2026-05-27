import { citySeeds } from "../data/cities.js";
import { prisma } from "./prisma.js";

export async function ensureCitiesSeeded() {
  const cityCount = await prisma.city.count();

  if (cityCount > 0) {
    return;
  }

  for (const city of citySeeds) {
    const createdCity = await prisma.city.upsert({
      where: { slug: city.slug },
      update: {
        name: city.name,
        state: city.state,
        description: city.description,
        imageUrl: city.imageUrl,
        isFeatured: city.isFeatured,
      },
      create: {
        name: city.name,
        slug: city.slug,
        state: city.state,
        description: city.description,
        imageUrl: city.imageUrl,
        isFeatured: city.isFeatured,
      },
      select: { id: true },
    });

    for (const area of city.areas) {
      await prisma.area.upsert({
        where: {
          cityId_name: {
            cityId: createdCity.id,
            name: area.name,
          },
        },
        update: {
          averageRent: area.averageRent,
          description: area.description,
        },
        create: {
          cityId: createdCity.id,
          name: area.name,
          averageRent: area.averageRent,
          description: area.description,
        },
      });
    }
  }

  console.log(`Seeded ${citySeeds.length} FlatBuddy cities.`);
}
