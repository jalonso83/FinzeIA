import React, { useState } from 'react';
import Navigation from '../components/Navigation';
import './Screens.css';
import * as XLSX from 'xlsx';

interface AmortizationRow {
  payment: number;
  paymentAmount: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

const LoanCalculator = () => {
  const [loanAmount, setLoanAmount] = useState('');
  const [loanType, setLoanType] = useState('hipotecario');
  const [interestRate, setInterestRate] = useState('5.5');
  const [term, setTerm] = useState('');
  const [termUnit, setTermUnit] = useState('años');
  const [monthlyPayment, setMonthlyPayment] = useState<number | null>(null);
  const [totalPayment, setTotalPayment] = useState<number | null>(null);
  const [totalInterest, setTotalInterest] = useState<number | null>(null);
  const [amortizationTable, setAmortizationTable] = useState<AmortizationRow[]>([]);
  const [showAmortization, setShowAmortization] = useState(false);

  const calculateLoan = () => {
    const principal = parseFloat(loanAmount);
    const rate = parseFloat(interestRate) / 100 / 12; // Tasa mensual
    const numberOfPayments = parseFloat(term) * (termUnit === 'años' ? 12 : 1);

    if (principal > 0 && rate > 0 && numberOfPayments > 0) {
      // Fórmula de cuota mensual: P * (r * (1 + r)^n) / ((1 + r)^n - 1)
      const monthlyRate = rate;
      const numPayments = numberOfPayments;
      
      const monthlyPaymentAmount = principal * 
        (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
        (Math.pow(1 + monthlyRate, numPayments) - 1);
      
      const totalPaymentAmount = monthlyPaymentAmount * numPayments;
      const totalInterestAmount = totalPaymentAmount - principal;

      setMonthlyPayment(monthlyPaymentAmount);
      setTotalPayment(totalPaymentAmount);
      setTotalInterest(totalInterestAmount);

      // Generar tabla de amortización
      generateAmortizationTable(principal, monthlyRate, numPayments, monthlyPaymentAmount);
    }
  };

  const generateAmortizationTable = (principal: number, monthlyRate: number, numPayments: number, monthlyPayment: number) => {
    const table: AmortizationRow[] = [];
    let remainingBalance = principal;

    for (let payment = 1; payment <= numPayments; payment++) {
      const interest = remainingBalance * monthlyRate;
      const principalPaid = monthlyPayment - interest;
      remainingBalance -= principalPaid;

      table.push({
        payment,
        paymentAmount: monthlyPayment,
        principal: principalPaid,
        interest,
        remainingBalance: Math.max(0, remainingBalance) // Evitar valores negativos por errores de redondeo
      });
    }

    setAmortizationTable(table);
  };

  const handleCalculate = () => {
    if (loanAmount && interestRate && term) {
      calculateLoan();
      setShowAmortization(false); // Ocultar tabla hasta que se calcule
    }
  };

  const handleReset = () => {
    setLoanAmount('');
    setLoanType('hipotecario');
    setInterestRate('5.5');
    setTerm('');
    setTermUnit('años');
    setMonthlyPayment(null);
    setTotalPayment(null);
    setTotalInterest(null);
    setAmortizationTable([]);
    setShowAmortization(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const downloadAmortizationTable = () => {
    if (amortizationTable.length === 0) return;

    // Crear workbook y worksheet
    const workbook = XLSX.utils.book_new();
    
    // Datos de la tabla de amortización
    const amortizationData = amortizationTable.map(row => [
      row.payment,
      row.paymentAmount,
      row.principal,
      row.interest,
      row.remainingBalance
    ]);

    // Agregar headers
    const headers = ['Cuota', 'Pago Mensual (RD$)', 'Capital (RD$)', 'Interés (RD$)', 'Saldo Restante (RD$)'];
    const worksheetData = [headers, ...amortizationData];

    // Crear worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Configurar anchos de columna
    const columnWidths = [
      { wch: 8 },  // Cuota
      { wch: 18 }, // Pago Mensual
      { wch: 18 }, // Capital
      { wch: 18 }, // Interés
      { wch: 18 }  // Saldo Restante
    ];
    worksheet['!cols'] = columnWidths;

    // Aplicar estilos a los headers
    const headerRange = XLSX.utils.decode_range(worksheet['!ref']!);
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;
      
      worksheet[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "204274" } }, // Color primario
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" }
        }
      };
    }

    // Aplicar formato de moneda a las columnas de dinero
    const moneyColumns = [1, 2, 3, 4]; // Columnas B, C, D, E
    for (let row = 1; row <= amortizationData.length; row++) {
      moneyColumns.forEach(col => {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].z = '"RD$"#,##0.00';
          worksheet[cellAddress].s = {
            alignment: { horizontal: "right" },
            border: {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" }
            }
          };
        }
      });
    }

    // Aplicar formato a la columna de cuota
    for (let row = 1; row <= amortizationData.length; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 });
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = {
          alignment: { horizontal: "center" },
          border: {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" }
          }
        };
      }
    }

    // Crear hoja de resumen
    const summaryData = [
      ['RESUMEN DEL PRÉSTAMO'],
      [''],
      ['Detalles del Préstamo', ''],
      ['Monto del Préstamo', parseFloat(loanAmount)],
      ['Tipo de Préstamo', loanType.charAt(0).toUpperCase() + loanType.slice(1)],
      ['Tasa de Interés Anual', parseFloat(interestRate) + '%'],
      ['Plazo', term + ' ' + termUnit],
      ['Número de Cuotas', parseFloat(term) * (termUnit === 'años' ? 12 : 1)],
      [''],
      ['Resultados del Cálculo', ''],
      ['Cuota Mensual', monthlyPayment],
      ['Pago Total', totalPayment],
      ['Interés Total', totalInterest],
      [''],
      ['Fecha de Generación', new Date().toLocaleDateString('es-DO')],
      ['Generado por', 'FinZen AI - Calculadora de Préstamos']
    ];

    const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Configurar anchos de columna para el resumen
    summaryWorksheet['!cols'] = [{ wch: 25 }, { wch: 20 }];

    // Aplicar estilos al resumen
    const summaryRange = XLSX.utils.decode_range(summaryWorksheet['!ref']!);
    
    // Título principal
    const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
    summaryWorksheet[titleCell].s = {
      font: { bold: true, size: 16, color: { rgb: "204274" } },
      alignment: { horizontal: "center" }
    };

    // Headers de secciones
    [2, 9].forEach(row => {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 });
      if (summaryWorksheet[cellAddress]) {
        summaryWorksheet[cellAddress].s = {
          font: { bold: true, color: { rgb: "204274" } },
          fill: { fgColor: { rgb: "E5E7EB" } }
        };
      }
    });

    // Formato de moneda para valores monetarios
    [3, 10, 11, 12].forEach(row => {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 1 });
      if (summaryWorksheet[cellAddress]) {
        summaryWorksheet[cellAddress].z = '"RD$"#,##0.00';
      }
    });

    // Agregar worksheets al workbook
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Resumen');
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tabla de Amortización');

    // Generar y descargar archivo
    const fileName = `tabla_amortizacion_${loanType}_${loanAmount}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="min-h-screen bg-background px-4 md:px-8 py-6">
      <Navigation />
      
      <div className="screen-container">
        <div className="screen-header">
          <h2 className="section-title text-text mb-6 font-bold">Calculadora de Préstamos</h2>
        </div>
        
        <div className="max-w-6xl mx-auto">
          {/* Descripción */}
          <div className="text-center mb-8">
            <p className="text-gray-600 text-lg">
              Calcula la cuota mensual aproximada de tu préstamo basado en diferentes factores.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Formulario de entrada */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">Detalles del Préstamo</h3>
              
              <div className="space-y-6">
                {/* Monto del Préstamo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto del Préstamo
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                      RD$
                    </span>
                    <input
                      type="number"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                {/* Tipo de Préstamo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Préstamo
                  </label>
                  <select
                    value={loanType}
                    onChange={(e) => setLoanType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="hipotecario">Hipotecario</option>
                    <option value="personal">Personal</option>
                    <option value="automotriz">Automotriz</option>
                    <option value="comercial">Comercial</option>
                  </select>
                </div>

                {/* Tasa de Interés */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tasa de Interés Anual
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      step="0.1"
                      className="w-full pr-8 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                      %
                    </span>
                  </div>
                </div>

                {/* Plazo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plazo
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                      placeholder="0"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                    <select
                      value={termUnit}
                      onChange={(e) => setTermUnit(e.target.value)}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="años">Años</option>
                      <option value="meses">Meses</option>
                    </select>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleReset}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCalculate}
                    disabled={!loanAmount || !interestRate || !term}
                    className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Calcular
                  </button>
                </div>
              </div>
            </div>

            {/* Resultados */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">Resultados del Cálculo</h3>
              
              {monthlyPayment !== null ? (
                <div className="space-y-6">
                  {/* Cuota Mensual */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-sm text-green-600 font-medium mb-1">Cuota Mensual</div>
                    <div className="text-2xl font-bold text-green-800">
                      {formatCurrency(monthlyPayment)}
                    </div>
                  </div>

                  {/* Pago Total */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-sm text-blue-600 font-medium mb-1">Pago Total</div>
                    <div className="text-xl font-bold text-blue-800">
                      {formatCurrency(totalPayment!)}
                    </div>
                  </div>

                  {/* Interés Total */}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="text-sm text-orange-600 font-medium mb-1">Interés Total</div>
                    <div className="text-xl font-bold text-orange-800">
                      {formatCurrency(totalInterest!)}
                    </div>
                  </div>

                  {/* Información adicional */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-2">Información del Préstamo</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Monto solicitado:</span>
                        <span className="font-medium">{formatCurrency(parseFloat(loanAmount))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Plazo:</span>
                        <span className="font-medium">{term} {termUnit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tasa anual:</span>
                        <span className="font-medium">{interestRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Número de cuotas:</span>
                        <span className="font-medium">{parseFloat(term) * (termUnit === 'años' ? 12 : 1)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Botón para ver tabla de amortización */}
                  <div className="pt-4">
                    <button
                      onClick={() => setShowAmortization(!showAmortization)}
                      className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      {showAmortization ? 'Ocultar' : 'Ver'} Tabla de Amortización
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Calculadora de Préstamos</h3>
                  <p className="text-gray-500">
                    Completa los detalles del préstamo y haz clic en "Calcular" para ver los resultados.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tabla de Amortización */}
          {showAmortization && amortizationTable.length > 0 && (
            <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-800">Tabla de Amortización</h3>
                <button
                  onClick={downloadAmortizationTable}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Descargar Excel
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Cuota</th>
                      <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Pago Mensual</th>
                      <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Capital</th>
                      <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Interés</th>
                      <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Saldo Restante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {amortizationTable.slice(0, 12).map((row, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{row.payment}</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{formatCurrency(row.paymentAmount)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{formatCurrency(row.principal)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{formatCurrency(row.interest)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{formatCurrency(row.remainingBalance)}</td>
                      </tr>
                    ))}
                    {amortizationTable.length > 12 && (
                      <tr className="bg-gray-100">
                        <td colSpan={5} className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-600">
                          ... y {amortizationTable.length - 12} cuotas más
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                <p>• Se muestran las primeras 12 cuotas. Descarga el archivo Excel para ver la tabla completa.</p>
                <p>• El archivo Excel incluye formato profesional, resumen del préstamo y tabla de amortización completa.</p>
              </div>
            </div>
          )}

          {/* Información adicional */}
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Información Importante</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Tipos de Préstamos</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Hipotecario:</strong> Para compra de vivienda</li>
                  <li>• <strong>Personal:</strong> Para gastos personales</li>
                  <li>• <strong>Automotriz:</strong> Para compra de vehículos</li>
                  <li>• <strong>Comercial:</strong> Para negocios</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Consideraciones</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Los resultados son aproximados</li>
                  <li>• Las tasas pueden variar según el banco</li>
                  <li>• Se incluyen solo intereses, no seguros</li>
                  <li>• Consulta con tu entidad financiera</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanCalculator; 