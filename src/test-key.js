require('dotenv').config(); console.log('Chave:', process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 20) + '...' : 'NÃO ENCONTRADA');
