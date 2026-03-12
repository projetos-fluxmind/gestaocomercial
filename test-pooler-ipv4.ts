import { Client } from 'pg';
const client = new Client({
  connectionString: 'postgresql://postgres.liwlngtcbokcthwbdrgx:tkxTVPd4-h4WH4@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});
client.connect()
  .then(() => {
    console.log('CONECTADO VIA POOLER IPV4!');
    process.exit(0);
  })
  .catch(err => {
    console.error('ERRO DE CONEXÃO:', err.message);
    process.exit(1);
  });
