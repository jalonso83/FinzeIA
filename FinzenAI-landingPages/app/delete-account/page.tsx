import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Eliminar Cuenta | FinZen AI',
  description: 'Solicita la eliminación de tu cuenta y datos personales de FinZen AI.',
};

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-finzen-white flex items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-finzen-black mb-2">
            Eliminar Cuenta de FinZen AI
          </h1>
          <p className="text-gray-500">
            Delete your FinZen AI account and personal data
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
          {/* Opción 1: Desde la app */}
          <section>
            <h2 className="text-xl font-semibold text-finzen-black mb-3">
              Desde la aplicación
            </h2>
            <p className="text-gray-600 mb-4">
              La forma más rápida de eliminar tu cuenta es directamente desde la app:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Abre <strong>FinZen AI</strong> en tu dispositivo</li>
              <li>Ve a <strong>Configuración</strong> (icono de engranaje)</li>
              <li>Desplázate hasta el final y toca <strong>&quot;Eliminar cuenta&quot;</strong></li>
              <li>Confirma la eliminación ingresando tu contraseña</li>
            </ol>
          </section>

          <hr className="border-gray-200" />

          {/* Opción 2: Por email */}
          <section>
            <h2 className="text-xl font-semibold text-finzen-black mb-3">
              Por correo electrónico
            </h2>
            <p className="text-gray-600 mb-4">
              Si no puedes acceder a la app, envía un correo a:
            </p>
            <a
              href="mailto:support@finzenai.com?subject=Solicitud%20de%20eliminación%20de%20cuenta&body=Solicito%20la%20eliminación%20de%20mi%20cuenta%20asociada%20al%20correo:%20[TU%20EMAIL]"
              className="inline-block bg-blue-600 text-white font-medium px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              support@finzenai.com
            </a>
            <p className="text-gray-500 text-sm mt-2">
              Incluye el correo electrónico asociado a tu cuenta.
            </p>
          </section>

          <hr className="border-gray-200" />

          {/* Datos que se eliminan */}
          <section>
            <h2 className="text-xl font-semibold text-finzen-black mb-3">
              Datos que se eliminan
            </h2>
            <p className="text-gray-600 mb-3">
              Al eliminar tu cuenta, se borran <strong>permanentemente</strong> todos tus datos:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Información personal (nombre, correo, teléfono)</li>
              <li>Transacciones y presupuestos</li>
              <li>Metas financieras</li>
              <li>Historial de conversaciones con Zenio</li>
              <li>Conexiones de email (Gmail/Outlook)</li>
              <li>Suscripciones y datos de pago</li>
              <li>Progreso de gamificación (FinScore, rachas, badges)</li>
              <li>Recordatorios de pago</li>
              <li>Reportes semanales</li>
            </ul>
            <p className="text-red-600 text-sm font-medium mt-3">
              Esta acción es irreversible. Los datos no se pueden recuperar una vez eliminados.
            </p>
          </section>

          <hr className="border-gray-200" />

          {/* Periodo de retención */}
          <section>
            <h2 className="text-xl font-semibold text-finzen-black mb-3">
              Periodo de retención
            </h2>
            <p className="text-gray-600">
              Los datos se eliminan de forma inmediata al confirmar la solicitud.
              No se conservan copias ni se retienen datos después de la eliminación.
            </p>
          </section>
        </div>

        <div className="text-center mt-8">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Volver a finzenai.com
          </Link>
        </div>
      </div>
    </div>
  );
}
