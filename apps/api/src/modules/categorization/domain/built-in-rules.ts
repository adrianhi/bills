export const builtInRules: { pattern: RegExp; merchant: string; category: string }[] = [
    // Supermercados
    { pattern: /\b(SM\s*BRAVO|BRAVO|SUPERMERCADOS?\s*BRAVO)\b/i, merchant: 'Supermercados Bravo', category: 'Supermercado' },
    { pattern: /\b(NACIONAL|SUPERMERCADOS?\s*NACIONAL)\b/i, merchant: 'Supermercados Nacional', category: 'Supermercado' },
    { pattern: /\b(JUMBO)\b/i, merchant: 'Jumbo', category: 'Supermercado' },
    { pattern: /\b(SIRENA|LA\s*SIRENA|SIRENA\s*MARKET)\b/i, merchant: 'La Sirena', category: 'Supermercado' },
    { pattern: /\b(OLE|HIPERMERCADOS?\s*OLE)\b/i, merchant: 'Hipermercados Olé', category: 'Supermercado' },
    { pattern: /\b(PLAZA\s*LAMA)\b/i, merchant: 'Plaza Lama', category: 'Supermercado' },
    { pattern: /\b(PRICESMART|PRICE\s*SMART)\b/i, merchant: 'PriceSmart', category: 'Supermercado' },
    { pattern: /\b(CARREFOUR)\b/i, merchant: 'Carrefour', category: 'Supermercado' },

    // Restaurantes & Delivery
    { pattern: /\b(PEDIDOSYA|PEDIDOS\s*YA)\b/i, merchant: 'PedidosYa', category: 'Restaurantes & Delivery' },
    { pattern: /\b(UBER[\s*]*EATS|UBEREATS)\b/i, merchant: 'Uber Eats', category: 'Restaurantes & Delivery' },
    { pattern: /\b(MCDONALD|MC\s*DONALDS?)\b/i, merchant: "McDonald's", category: 'Restaurantes & Delivery' },
    { pattern: /\b(BURGER\s*KING|BK)\b/i, merchant: 'Burger King', category: 'Restaurantes & Delivery' },
    { pattern: /\b(WENDYS?|WENDY'S)\b/i, merchant: "Wendy's", category: 'Restaurantes & Delivery' },
    { pattern: /\b(KFC|KENTUCKY)\b/i, merchant: 'KFC', category: 'Restaurantes & Delivery' },
    { pattern: /\b(PIZZA\s*HUT)\b/i, merchant: 'Pizza Hut', category: 'Restaurantes & Delivery' },
    { pattern: /\b(DOMINOS?\s*PIZZA|DOMINO'S)\b/i, merchant: "Domino's Pizza", category: 'Restaurantes & Delivery' },
    { pattern: /\b(PAPA\s*JOHNS?)\b/i, merchant: "Papa John's", category: 'Restaurantes & Delivery' },
    { pattern: /\b(STARBUCKS?)\b/i, merchant: 'Starbucks', category: 'Restaurantes & Delivery' },
    { pattern: /\b(CHEF\s*PEPPER)\b/i, merchant: 'Chef Pepper', category: 'Restaurantes & Delivery' },
    { pattern: /\b(SUSHIBAR|SBX|TACO\s*BELL|PFPJ|SUBWAY)\b/i, merchant: 'Restaurante / Comida Rápida', category: 'Restaurantes & Delivery' },

    // Transporte & Combustible
    { pattern: /\b(UBER(\s*TRIP|\s*PENDING|\s*RIDE)?)\b/i, merchant: 'Uber', category: 'Transporte' },
    { pattern: /\b(INDRIVE|INDRIVER)\b/i, merchant: 'InDrive', category: 'Transporte' },
    { pattern: /\b(CABIFY|DIDIFL)\b/i, merchant: 'Taxi / Transporte', category: 'Transporte' },
    { pattern: /\b(PEAJE|PASO\s*RAPIDO|RD\s*VIAL)\b/i, merchant: 'Paso Rápido / Peaje', category: 'Transporte' },
    { pattern: /\b(TOTAL|TOTALENERGIES|TOTAL\s*ENERGIES)\b/i, merchant: 'TotalEnergies', category: 'Combustible' },
    { pattern: /\b(SUNIX|ESTACION\s*SUNIX)\b/i, merchant: 'Sunix', category: 'Combustible' },
    { pattern: /\b(SHELL)\b/i, merchant: 'Shell', category: 'Combustible' },
    { pattern: /\b(TEXACO)\b/i, merchant: 'Texaco', category: 'Combustible' },
    { pattern: /\b(NEXGEN|ECOPETROL|NATIVE|ISLA)\b/i, merchant: 'Estación de Combustible', category: 'Combustible' },

    // Salud & Farmacia
    { pattern: /\b(CAROL|FARMACIA\s*CAROL)\b/i, merchant: 'Farmacia Carol', category: 'Salud & Farmacia' },
    { pattern: /\b(GBC|FARMACIA\s*GBC)\b/i, merchant: 'Farmacia GBC', category: 'Salud & Farmacia' },
    { pattern: /\b(FARMACIA\s*LOS\s*HIDALGOS|LOS\s*HIDALGOS)\b/i, merchant: 'Farmacia Los Hidalgos', category: 'Salud & Farmacia' },
    { pattern: /\b(LABORATORIO\s*AMADITA|AMADITA)\b/i, merchant: 'Amadita Laboratorio', category: 'Salud & Farmacia' },
    { pattern: /\b(REFERENCIA\s*LABORATORIO|REFERENCIA)\b/i, merchant: 'Referencia Laboratorio', category: 'Salud & Farmacia' },
    { pattern: /\b(CEDIMAT|CLINICA|HOSPITAL|CENTRO\s*MEDICO|HOMS)\b/i, merchant: 'Centro Médico', category: 'Salud & Farmacia' },

    // Servicios & Telecomunicaciones
    { pattern: /\b(CLARO|CLARO\s*DOMINICANA|CLARO\s*CODETEL)\b/i, merchant: 'Claro Dominicana', category: 'Servicios' },
    { pattern: /\b(ALTICE|ALTICE\s*DOMINICANA)\b/i, merchant: 'Altice Dominicana', category: 'Servicios' },
    { pattern: /\b(VIVA|TRILOGY\s*DOMINICANA)\b/i, merchant: 'Viva', category: 'Servicios' },
    { pattern: /\b(EDEESTE|EDE\s*ESTE)\b/i, merchant: 'EdeEste', category: 'Servicios' },
    { pattern: /\b(EDESUR|EDE\s*SUR)\b/i, merchant: 'EdeSur', category: 'Servicios' },
    { pattern: /\b(EDENORTE|EDE\s*NORTE)\b/i, merchant: 'EdeNorte', category: 'Servicios' },
    { pattern: /\b(CAASD|CORAASAN|AGUA)\b/i, merchant: 'Servicio de Agua', category: 'Servicios' },

    // Suscripciones & Streaming & Tecnología
    { pattern: /\b(NETFLIX|NETFLIX\.COM)\b/i, merchant: 'Netflix', category: 'Suscripciones' },
    { pattern: /\b(SPOTIFY)\b/i, merchant: 'Spotify', category: 'Suscripciones' },
    { pattern: /\b(APPLE|APPLE\.COM|ITUNES)\b/i, merchant: 'Apple Services', category: 'Suscripciones' },
    { pattern: /\b(GOOGLE|GOOGLE\s*CLOUD|GOOGLE\s*PLAY|YOUTUBE)\b/i, merchant: 'Google', category: 'Suscripciones' },
    { pattern: /\b(AMAZON\s*PRIME|PRIME\s*VIDEO)\b/i, merchant: 'Amazon Prime', category: 'Suscripciones' },
    { pattern: /\b(DISNEY\+|DISNEYPLUS|DISNEY\s*PLUS)\b/i, merchant: 'Disney+', category: 'Suscripciones' },
    { pattern: /\b(HBO|MAX|HBOMAX)\b/i, merchant: 'Max (HBO)', category: 'Suscripciones' },
    { pattern: /\b(OPENAI|CHATGPT)\b/i, merchant: 'OpenAI (ChatGPT)', category: 'Tecnología' },
    { pattern: /\b(GITHUB|MICROSOFT|AWS|DIGITALOCEAN|HEROKU|VERCEL)\b/i, merchant: 'Cloud & Dev Services', category: 'Tecnología' },

    // Compras & Retail
    { pattern: /\b(AMAZON|AMZN|AMAZON\.COM)\b/i, merchant: 'Amazon', category: 'Compras Online' },
    { pattern: /\b(SHEIN|ALIEXPRESS|TEMU|EBAY)\b/i, merchant: 'Compras Online', category: 'Compras Online' },
    { pattern: /\b(IKEA|IKEA\s*DOMINICANA)\b/i, merchant: 'IKEA', category: 'Hogar' },
    { pattern: /\b(CASA\s*CUESTA|BEBE\s*MUNDO|JUGUETON)\b/i, merchant: 'Casa Cuesta / CCN', category: 'Hogar' },
    { pattern: /\b(ZARA|BERSHKA|PULL\s*&\s*BEAR|STRADIVARIUS|MANGO|H&M)\b/i, merchant: 'Tienda de Ropa', category: 'Ropa & Moda' },

    // Bancos & Retiros de Efectivo
    { pattern: /\b(BANCO\s*BHD|BHD\s*LEON|BHD)\b/i, merchant: 'Banco BHD', category: 'Servicios Financieros' },
    { pattern: /\b(BANCO\s*RESERVAS|BANRESERVAS|RESERVAS)\b/i, merchant: 'Banreservas', category: 'Servicios Financieros' },
    { pattern: /\b(BANCO\s*POPULAR|POPULAR|BPD)\b/i, merchant: 'Banco Popular', category: 'Servicios Financieros' },
    { pattern: /\b(SCOTIABANK|APAP|PROMERICA|BANCO\s*SANTA\s*CRUZ)\b/i, merchant: 'Entidad Bancaria', category: 'Servicios Financieros' },

    // Entretenimiento & Ocio
    { pattern: /\b(CARIBBEAN\s*CINEMAS?|CARIBBEAN)\b/i, merchant: 'Caribbean Cinemas', category: 'Entretenimiento' },
    { pattern: /\b(PALACIO\s*DEL\s*CINE)\b/i, merchant: 'Palacio del Cine', category: 'Entretenimiento' },
    { pattern: /\b(SMARTFIT|SMART\s*FIT|GYM|BODY\s*SHOP|GOLD'S\s*GYM)\b/i, merchant: 'Gimnasio / Fitness', category: 'Salud & Deporte' },
    { pattern: /\b(AGORA\s*MALL|BLUE\s*MALL|SAMBIL|DOWNTOWN\s*CENTER|GALERIA\s*360)\b/i, merchant: 'Centro Comercial', category: 'Entretenimiento' },
  ];
