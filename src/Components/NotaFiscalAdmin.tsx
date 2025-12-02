"use client"

import React, { useState } from "react";

const NotaFiscalAdmin = () => {
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
            Nota Fiscal
          </h1>
          <p className="text-gray-600 mt-2">
            Gerencie as notas fiscais do sistema
          </p>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 md:p-8">
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-orange-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Área de Nota Fiscal
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              As funcionalidades de gerenciamento de notas fiscais serão implementadas em breve.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotaFiscalAdmin;
