const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('../middlewares/logger');

/**
 * Crea el transportador de correo.
 * Si no hay credenciales SMTP configuradas, devuelve null (modo demo).
 */
const getTransporter = () => {
  if (!config.email.user || !config.email.password) {
    return null;
  }

  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    auth: {
      user: config.email.user,
      pass: config.email.password
    }
  });
};

/**
 * Envía una factura en PDF al correo del huésped.
 * @param {string} to - Correo del destinatario
 * @param {object} factura - Datos de la factura { id_factura, nombre_cliente, total, ... }
 * @param {Buffer} pdfBuffer - Buffer del PDF de la factura
 */
const enviarFacturaPorCorreo = async (to, factura, pdfBuffer) => {
  const transporter = getTransporter();
  if (!transporter) {
    logger.warn(`Email no configurado. Factura #${factura?.id_factura} no enviada a ${to}.`);
    return { success: false, motivo: 'SMTP no configurado' };
  }

  if (!to) {
    logger.warn('No se proporcionó correo del huésped.');
    return { success: false, motivo: 'Correo no proporcionado' };
  }

  const mailOptions = {
    from: config.email.from,
    to,
    subject: `Factura #${factura.id_factura} - Hotel Los Arcos`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <div style="background:#0a1628;color:#f5c542;padding:24px;text-align:center;">
          <h1 style="margin:0;letter-spacing:2px;">Hotel Los Arcos</h1>
          <p style="margin:4px 0 0;color:#e2e8f0;font-size:13px;">Gestión Profesional de Alojamiento</p>
        </div>
        <div style="padding:24px;color:#1f2937;">
          <h2 style="margin:0 0 16px;color:#0a1628;">Factura N° ${factura.id_factura}</h2>
          <p><strong>Cliente:</strong> ${factura.nombre_cliente || ''}</p>
          <p><strong>Documento:</strong> ${factura.documento_cliente || ''}</p>
          <p><strong>Total:</strong> $${Number(factura.total || 0).toFixed(2)}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
          <p style="font-size:13px;color:#6b7280;">Adjuntamos su factura en formato PDF. Gracias por preferirnos.</p>
        </div>
        <div style="background:#f8fafc;padding:12px;text-align:center;font-size:12px;color:#94a3b8;">
          Hotel Los Arcos · Sistema de Gestión Hotelera
        </div>
      </div>
    `,
    attachments: pdfBuffer
      ? [{ filename: `factura-${factura.id_factura}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
      : []
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Factura #${factura.id_factura} enviada a ${to}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Error enviando factura por correo:', { error: error.message, stack: error.stack });
    return { success: false, motivo: error.message };
  }
};

module.exports = {
  enviarFacturaPorCorreo
};
