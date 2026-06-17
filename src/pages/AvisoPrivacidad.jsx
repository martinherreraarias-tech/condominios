import { useNavigate } from 'react-router-dom'

export default function AvisoPrivacidad() {
  const navigate = useNavigate()
  return (
    <div className="app">
      <div className="container" style={{ maxWidth: 760 }}>
        <button className="back-link" onClick={() => navigate(-1)}>← Volver</button>
        <div className="page-head">
          <div>
            <h1 className="page-title">Aviso de Privacidad</h1>
            <p className="page-sub">Última actualización: junio 2026</p>
          </div>
        </div>

        <div className="legal">
          <p>
            En cumplimiento de la Ley Federal de Protección de Datos Personales en Posesión de los
            Particulares (LFPDPPP), su Reglamento y demás normativa aplicable, ponemos a tu
            disposición el presente Aviso de Privacidad.
          </p>

          <h2>1. Responsable</h2>
          <p>
            <strong>Fortalezas Consultoría / Soluciones Digitales</strong> ("el Responsable"), con
            domicilio en <strong>[completar domicilio fiscal]</strong>, es responsable del tratamiento
            de tus datos personales. La plataforma opera el servicio de administración de condominios
            por cuenta de la administración de cada condominio.
          </p>

          <h2>2. Datos personales que recabamos</h2>
          <p>Para las finalidades descritas, podemos recabar:</p>
          <ul>
            <li><strong>Identificación y contacto:</strong> nombre, correo electrónico y la unidad o domicilio que ocupas dentro del condominio.</li>
            <li><strong>Datos de uso del servicio:</strong> registros de acceso (entradas/salidas y visitas), reservas de áreas comunes, paquetería, así como pagos y comprobantes que cargas voluntariamente.</li>
          </ul>
          <p>No recabamos datos personales sensibles.</p>

          <h2>3. Finalidades del tratamiento</h2>
          <p><strong>Primarias</strong> (necesarias para prestarte el servicio):</p>
          <ul>
            <li>Administrar el condominio: cobranza, control de accesos, reservas, paquetería y comunicación.</li>
            <li>Crear, gestionar y autenticar tu cuenta de usuario.</li>
            <li>Enviar notificaciones operativas (avisos, paquetes en caseta, registro de visitas).</li>
          </ul>
          <p><strong>Secundarias</strong> (no necesarias):</p>
          <ul>
            <li>Mejorar y dar mantenimiento al servicio. Puedes oponerte a estas finalidades sin que ello afecte la prestación del servicio principal.</li>
          </ul>

          <h2>4. Transferencias y encargados</h2>
          <p>
            Para operar el servicio utilizamos proveedores tecnológicos que tratan datos por nuestra
            cuenta (alojamiento, base de datos y envío de mensajes; por ejemplo, Supabase y
            SendGrid/Twilio). <strong>No vendemos tus datos personales.</strong> No realizamos
            transferencias que requieran tu consentimiento, salvo aquellas necesarias para operar el
            servicio o las exigidas por autoridad competente conforme a la ley.
          </p>

          <h2>5. Derechos ARCO</h2>
          <p>
            Tienes derecho a <strong>Acceder</strong> a tus datos, <strong>Rectificarlos</strong>
            cuando sean inexactos, <strong>Cancelarlos</strong> cuando consideres que no se requieren,
            u <strong>Oponerte</strong> a su tratamiento. Para ejercer cualquiera de estos derechos,
            envía tu solicitud a <strong>fortalezasconsultoria@gmail.com</strong>, indicando tu nombre,
            el derecho que deseas ejercer y la descripción clara de los datos involucrados.
          </p>

          <h2>6. Revocación del consentimiento</h2>
          <p>
            Puedes revocar el consentimiento que nos otorgaste escribiendo a
            <strong> fortalezasconsultoria@gmail.com</strong>. Ten en cuenta que la revocación puede
            implicar que no podamos seguir prestándote el servicio.
          </p>

          <h2>7. Tecnologías de rastreo</h2>
          <p>
            La aplicación utiliza almacenamiento local del navegador únicamente para mantener tu sesión
            iniciada y el funcionamiento básico. No empleamos cookies de publicidad ni rastreo de
            terceros.
          </p>

          <h2>8. Cambios al aviso de privacidad</h2>
          <p>
            Este aviso puede actualizarse. La versión vigente estará siempre disponible dentro de la
            aplicación. El uso continuado del servicio implica la aceptación del aviso vigente.
          </p>
        </div>
      </div>
    </div>
  )
}
