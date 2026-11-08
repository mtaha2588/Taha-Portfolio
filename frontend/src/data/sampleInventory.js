/**
 * Offline copy of the backend's sample inventory
 * (backend/app/demos/car_sales/inventory.py). Used only so the 3D
 * showroom can still render when the demo API is unreachable. Generic
 * demo vehicles, not a real dealership's stock.
 */
export const SAMPLE_INVENTORY = {
  sample_data: true,
  source: "local",
  vehicles: [
    {
      id: "v-101",
      name: "Electric Sedan",
      body_type: "sedan",
      year: 2025,
      price: 41900,
      fuel: "electric",
      mileage_km: 8200,
    },
    { id: "v-102", name: "Midsize SUV", body_type: "suv", year: 2024, price: 36500, fuel: "hybrid", mileage_km: 21000 },
    {
      id: "v-103",
      name: "Sports Coupe",
      body_type: "coupe",
      year: 2023,
      price: 58900,
      fuel: "petrol",
      mileage_km: 15400,
    },
    {
      id: "v-104",
      name: "Compact Hatchback",
      body_type: "hatchback",
      year: 2024,
      price: 21900,
      fuel: "petrol",
      mileage_km: 12800,
    },
    {
      id: "v-105",
      name: "Family Minivan",
      body_type: "minivan",
      year: 2022,
      price: 29800,
      fuel: "hybrid",
      mileage_km: 46000,
    },
    {
      id: "v-106",
      name: "Pickup Truck",
      body_type: "truck",
      year: 2023,
      price: 44700,
      fuel: "diesel",
      mileage_km: 33500,
    },
  ],
};
