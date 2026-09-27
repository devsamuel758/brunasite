// Servidor para gerenciar agendamentos e enviar notificações WhatsApp
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// IMPORTANTE: Configure estas variáveis no arquivo .env
// TWILIO_ACCOUNT_SID=seu_sid
// TWILIO_AUTH_TOKEN=seu_token
// TWILIO_PHONE=seu_numero_twilio
// OWNER_PHONE=seu_numero_whatsapp (DDD + número, ex: 85992532670)

// ============= Usando Twilio =============
const twilio = require('twilio');
const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// ============= Endpoint para enviar mensagem WhatsApp =============
app.post('/api/enviar-whatsapp', async (req, res) => {
    try {
        const { telefone, nome, data, hora, servicos, tipo = 'cliente' } = req.body;

        if (!telefone || !nome) {
            return res.status(400).json({ erro: 'Telefone e nome são obrigatórios' });
        }

        let mensagem = '';
        const formattedPhone = `+55${telefone}`;

        if (tipo === 'cliente') {
            // Mensagem para o cliente
            const servicosTexto = Array.isArray(servicos) ? servicos.join(', ') : servicos;
            mensagem = `🎀 *Confirmação de Agendamento* 🎀\n\n` +
                `Olá ${nome}! Seu agendamento foi confirmado:\n\n` +
                `📅 Data: ${new Date(data).toLocaleDateString('pt-BR')}\n` +
                `⏰ Horário: ${hora}\n` +
                `💅 Serviços: ${servicosTexto}\n\n` +
                `Qualquer dúvida, nos chame!\n\n` +
                `*Bruna Nail* ✨`;
        } else if (tipo === 'admin') {
            // Mensagem para você (admin)
            const servicosTexto = Array.isArray(servicos) ? servicos.join(', ') : servicos;
            mensagem = `⏰ *NOVO AGENDAMENTO* ⏰\n\n` +
                `👤 Cliente: ${nome}\n` +
                `📱 WhatsApp: ${telefone}\n` +
                `📅 Data: ${new Date(data).toLocaleDateString('pt-BR')}\n` +
                `⏰ Horário: ${hora}\n` +
                `💅 Serviços: ${servicosTexto}`;
        }

        // Enviar via Twilio
        const message = await twilioClient.messages.create({
            from: `whatsapp:${process.env.TWILIO_PHONE}`,
            to: `whatsapp:${formattedPhone}`,
            body: mensagem
        });

        console.log(`Mensagem enviada para ${formattedPhone}`);
        res.json({ 
            sucesso: true, 
            mensagem: 'Mensagem enviada com sucesso',
            messageSid: message.sid 
        });

    } catch (erro) {
        console.error('Erro ao enviar WhatsApp:', erro);
        res.status(500).json({ 
            erro: 'Erro ao enviar mensagem',
            detalhes: erro.message 
        });
    }
});

// ============= Endpoint para notificar admin =============
app.post('/api/notificar-admin', async (req, res) => {
    try {
        const { nome, data, hora, servicos, telefone } = req.body;
        const ownerPhone = `+55${process.env.OWNER_PHONE}`;

        const servicosTexto = Array.isArray(servicos) ? servicos.join(', ') : servicos;
        const mensagem = `🔔 *NOVO AGENDAMENTO* 🔔\n\n` +
            `👤 ${nome}\n` +
            `📱 ${telefone}\n` +
            `📅 ${new Date(data).toLocaleDateString('pt-BR')}\n` +
            `⏰ ${hora}\n` +
            `💅 ${servicosTexto}`;

        await twilioClient.messages.create({
            from: `whatsapp:${process.env.TWILIO_PHONE}`,
            to: `whatsapp:${ownerPhone}`,
            body: mensagem
        });

        res.json({ sucesso: true });
    } catch (erro) {
        console.error('Erro ao notificar admin:', erro);
        res.status(500).json({ erro: erro.message });
    }
});

app.listen(PORT, () => {
    console.log(`🎉 Servidor rodando em http://localhost:${PORT}`);
    console.log(`⚠️  Certifique-se de configurar as variáveis de ambiente em .env`);
});
