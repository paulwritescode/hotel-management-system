export type MenuCatalogItem = {
  name: string
  nameSwahili?: string
  category: 'staple' | 'vegetable' | 'meat' | 'bread' | 'drink' | 'dessert' | 'side'
  priceKes: number
  preparationMinutes: number
  description?: string
  unit?: string
  imageUrl?: string
  imageAlt?: string
  creditUrl?: string
  offer?: { label: string; originalPriceKes: number; offerPriceKes: number; active: boolean }
}

const item = (name: string, category: MenuCatalogItem['category'], priceKes: number, preparationMinutes = 15, description?: string): MenuCatalogItem => ({ name, category, priceKes, preparationMinutes, ...(description ? { description } : {}) })
const pizza = (name: string, prices: [number, number, number]): MenuCatalogItem[] => (['Small', 'Medium', 'Large'] as const).map((size, index) => item(`${name} - ${size}`, 'meat', prices[index]!, 25, `${size} ${name.toLowerCase()} pizza.`))

export const menuCatalog: MenuCatalogItem[] = [
  item('Espresso', 'drink', 180, 5, 'Single espresso.'), item('Americano', 'drink', 170, 5), item('Cappuccino', 'drink', 200, 7),
  item('Café Latte', 'drink', 200, 7), item('Cafe Mocha', 'drink', 200, 7), item('Caramel Macchiato', 'drink', 300, 8), item('Vanilla Iced Coffee', 'drink', 300, 8), item('Iced Coffee', 'drink', 250, 8),
  item('Espresso Double', 'drink', 220, 5), item('Americano Double', 'drink', 200, 5), item('Café Latte Double', 'drink', 250, 7), item('Cafe Mocha Double', 'drink', 250, 7),
  item('African Masala Chai', 'drink', 150, 10), item('Milked Tea', 'drink', 130, 8), item('Black Tea', 'drink', 100, 6), item('Lemon Ginger Tea', 'drink', 200, 8), item('Mint Tea', 'drink', 180, 8), item('Green Tea', 'drink', 200, 6), item('Hot Chocolate', 'drink', 350, 8),
  item('Classic Dawa', 'drink', 250, 8, 'Honey, lemon and ginger.'), item('Turmeric Latte', 'drink', 300, 8), item('Vanilla Chai Latte', 'drink', 350, 8),
  item('Muffin', 'bread', 280, 5, 'Blueberry, almond, lemon poppy, chocolate or plain.'), item('Croissant', 'bread', 250, 5, 'Plain or chocolate.'), item('Doughnuts', 'dessert', 60, 5), item('Hotdogs', 'meat', 110, 10), item('Beef Samosa', 'meat', 60, 10), item('Spanish Omelette', 'staple', 140, 12), item('Plain Omelette', 'staple', 100, 10), item('Chapati Mayai', 'staple', 180, 12), item('Plain Pancake', 'bread', 150, 10), item('Chapati', 'bread', 60, 8), item('Chapati Roll', 'bread', 180, 12), item('Andazi', 'bread', 50, 5), item('Kebab', 'meat', 130, 10), item('Smokie', 'meat', 50, 8), item('Beef Sausage', 'meat', 70, 8), item('French Toast', 'bread', 180, 10), item('Toast', 'bread', 100, 6), item('Plain Toast', 'bread', 60, 5), item('Toast Mayai', 'staple', 150, 10), item('Two Boiled Eggs', 'staple', 100, 10),
  item('Soda 300ml', 'drink', 120, 2), item('Sparkling Water 500ml', 'drink', 100, 2), item('Mayers Still Water 500ml', 'drink', 80, 2), item('Mayers Still Water 1 litre', 'drink', 130, 2), item('Lemon Water', 'drink', 100, 3), item('Passion Juice', 'drink', 200, 5), item('Orange Juice', 'drink', 220, 5), item('Pineapple Mint', 'drink', 200, 5), item('Mango Juice', 'drink', 200, 5),
  item('Crispy Chicken Wings (6pcs)', 'meat', 650, 25), item('Crispy Chicken Wings (10pcs)', 'meat', 1200, 25), item('Beef Samosa Basket (4pcs)', 'meat', 350, 12), item('Fish Fingers with Fries', 'meat', 580, 20), item('Masala Fries', 'side', 250, 15), item('Loaded Bhajia', 'side', 380, 15),
  item('Creamy Alfredo Chicken Pasta', 'staple', 1350, 25), item('Spaghetti Meatballs', 'staple', 1100, 25), item('Spicy Arrabiata Fish Pasta', 'staple', 1350, 25), item('Chicken Fried Rice Bowl', 'staple', 850, 20), item('Beef Pilau Bowl', 'staple', 450, 20),
  item('Grill Platter', 'meat', 1350, 30), item('Urban Mix Platter', 'meat', 1450, 30), item('Ultimate Sharing Platter', 'meat', 2300, 35), item('Nyama Choma Platter 2', 'meat', 2500, 35),
  item('Garden Salad', 'vegetable', 650, 10), item('Chicken Caesar Salad', 'meat', 800, 15),
  item('Beef Stew + Ugali', 'meat', 400, 25), item('Beef Stew + Mukimo', 'meat', 400, 25), item('Wet Fry Chicken + Chips', 'meat', 450, 25), item('Whole Fish', 'meat', 600, 25), item('Tilapia Fillet Salsa', 'meat', 950, 20), item('Traditional Fried Matumbo', 'meat', 360, 25), item('Stir Fry Beef + Fries/Chapati/Ugali/Rice', 'meat', 400, 20), item('Butter Chicken', 'meat', 650, 25), item('Beef Curry + Ugali/Chapati/Rice', 'meat', 490, 25), item('Sizzling Beef Steak + Chips/Chapati', 'meat', 580, 25), item('Roast Chicken + French Fries', 'meat', 430, 25), item('Honey Orange Glazed Chicken Half', 'meat', 700, 30), item('Roasted BBQ Chicken Half', 'meat', 700, 30), item('Pilau served with Vegetables', 'staple', 300, 20), item('Liver Fry + Rice/Chapati/Ugali', 'meat', 500, 20),
  item('Spinach', 'vegetable', 100, 10), item('Ugali', 'staple', 100, 15), item('Coleslaw/Kachumbari', 'side', 100, 8), item('Fries', 'side', 150, 15), item('Bhajia', 'side', 180, 15), item('Mashed Potatoes', 'side', 100, 15), item('Pilau with Kachumbari', 'staple', 200, 15), item('Steamed Rice', 'staple', 100, 15), item('Mukimo', 'staple', 100, 15),
  item('Chocolate Fudge Cake', 'dessert', 350, 5), item('White Forest Cake', 'dessert', 350, 5), item('Biscoff Cheese Cake', 'dessert', 450, 5), item('Chocolate Donuts', 'dessert', 300, 5), item('Ice Cream Sundae', 'dessert', 400, 5), item('Blueberry Cake', 'dessert', 450, 5), item('Red Velvet', 'dessert', 350, 5), item('Carrot Cake', 'dessert', 300, 5), item('Lotus Cake', 'dessert', 400, 5), item('Cheese Cake', 'dessert', 350, 5), item('Salted Caramel', 'dessert', 400, 5), item('Chocolate Brownie', 'dessert', 350, 5),
  item('Chicken Tikka Pizza', 'meat', 650, 25), item('BBQ Chicken Pizza', 'meat', 650, 25), item('Nyama Choma Pizza', 'meat', 690, 25), item('Chicken Mushroom Pizza', 'meat', 650, 25), item('Hawaiian Pizza', 'meat', 690, 25), item('Margherita Pizza', 'vegetable', 690, 20), item('Boerwores Pizza', 'meat', 690, 25), item('Periperi Chicken Pizza', 'meat', 650, 25),
  ...pizza('Chicken Tikka', [650, 950, 1200]), ...pizza('BBQ Chicken', [650, 950, 1200]), ...pizza('Boerwores', [690, 990, 1250]), ...pizza('Nyama Choma', [690, 990, 1250]), ...pizza('Chicken Mushroom', [650, 950, 1200]), ...pizza('Periperi Chicken', [650, 950, 1200]), ...pizza('Hawaiian', [690, 699, 1299]), ...pizza('Margherita', [650, 699, 1299]),
  item('Chicken Cheese Burger', 'meat', 450, 15), item('Beef Cheese Burger', 'meat', 550, 15), item('Cheese Burger', 'meat', 400, 15), item('Chicken Sandwich', 'meat', 300, 12), item('Beef Sandwich', 'meat', 350, 12),
  item('Chicken Soup', 'meat', 230, 20), item('Ossubuko', 'meat', 190, 20), item('Mushroom Soup', 'vegetable', 280, 15), item('Butternut Soup', 'vegetable', 150, 15), item('Sweet Cone Soup with Vegetables', 'vegetable', 250, 15), item('Bone Soup', 'meat', 80, 20), item('Wimbi Porridge', 'drink', 100, 10), item('Uji Power', 'drink', 180, 10),
  item('Mango Passion Bliss', 'drink', 350, 8), item('Pineapple Coconut Splash', 'drink', 400, 8), item('Avocado Power Smoothie', 'drink', 400, 8), item('Peanut Butter Smoothie', 'drink', 450, 8), item('Mango Smoothie', 'drink', 400, 8), item('Mixed Fruit Smoothie', 'drink', 400, 8), item('Lotus Smoothie', 'drink', 400, 8), item('Lemonade - Passion', 'drink', 300, 5), item('Lemonade - Strawberry', 'drink', 300, 5), item('Lemonade - Classic', 'drink', 300, 5),
  item('Vanilla Shake', 'drink', 300, 8), item('Strawberry Shake', 'drink', 300, 8), item('Blueberry Shake', 'drink', 300, 8), item('Oreo Shake', 'drink', 300, 8), item('Chocolate Shake', 'drink', 330, 8), item('Salted Caramel Shake', 'drink', 400, 8), item('Espresso Shake', 'drink', 430, 8),
  item('Heavenly Signature Mojito', 'drink', 700, 10), item('Passion Mojito', 'drink', 500, 10), item('Strawberry Mint Sparkler', 'drink', 500, 10), item('Heavenly Sunset', 'drink', 550, 10), item('Virgin Mojito', 'drink', 500, 10), item('Coconut Mojito', 'drink', 400, 10), item('Blueberry Mojito', 'drink', 500, 10), item('Mixberry Mojito', 'drink', 400, 10), item('Virgin Pinacolada', 'drink', 500, 10), item('Mango Ginger Fizz', 'drink', 500, 10),
  item('Milk Fruit Smoothie', 'drink', 450, 8, 'Fresh milk blended with seasonal fruit.'),
  item('Heavenly Quick Fix', 'staple', 200, 10, 'Tea with mandazi, or chapati with sausage.'),
  item('Heavenly Power Breakfast', 'staple', 200, 12, 'Two sausages with kachumbari and chapati.'),
  item('Heavenly Healthy Breakfast', 'staple', 250, 12, 'Nduma, ngwaci and tea.'),
  item('Sizzling Beef Steak + Ugali', 'meat', 700, 25, 'Sizzling beef steak served with ugali.'),
  { ...item('Sizzling Beef Steak + Ugali', 'meat', 700, 25, 'Sizzling beef steak served with ugali.'), offer: { label: 'Weekly offer', originalPriceKes: 700, offerPriceKes: 650, active: true } },
  { ...item('Tilapia Fillet Salsa', 'meat', 950, 20), offer: { label: 'Weekly offer', originalPriceKes: 950, offerPriceKes: 800, active: true } },
  { ...item('Milk Fruit Smoothie', 'drink', 450, 8, 'Fresh milk blended with seasonal fruit.'), offer: { label: 'Weekly offer', originalPriceKes: 450, offerPriceKes: 400, active: true } },
  { ...item('Chicken Fried Rice Bowl', 'staple', 850, 20), offer: { label: 'Weekly offer', originalPriceKes: 850, offerPriceKes: 750, active: true } },
  { ...item('Roast Chicken + French Fries', 'meat', 650, 25), offer: { label: 'Weekly offer', originalPriceKes: 650, offerPriceKes: 600, active: true } },
  { ...item('Cappuccino Double', 'drink', 250, 7), offer: { label: 'Double cappuccino', originalPriceKes: 250, offerPriceKes: 230, active: true } },
  { ...item('Passion Mojito', 'drink', 500, 8), offer: { label: 'Weekly offer', originalPriceKes: 500, offerPriceKes: 450, active: true } },
]
