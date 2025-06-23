import React from 'react'
import Link from 'next/link'

const EmailVerification = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 max-w-md w-full flex flex-col items-center text-center gap-4">
        <svg width="64" height="64" fill="none" viewBox="0 0 24 24" className="mb-2 text-orange-500">
          <path fill="currentColor" d="M2 6.5A2.5 2.5 0 0 1 4.5 4h15A2.5 2.5 0 0 1 22 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 17.5v-11Zm2.5-.5a.5.5 0 0 0-.5.5v.379l8 5.333 8-5.333V6.5a.5.5 0 0 0-.5-.5h-15Zm15 13a.5.5 0 0 0 .5-.5v-8.379l-7.5 5-7.5-5V17.5a.5.5 0 0 0 .5.5h15Z"/>
        </svg>
        <h1 className="text-2xl md:text-3xl font-bold text-orange-600 mb-2">Verifique seu e-mail</h1>
        <p className="text-gray-700 text-base">
          Enviamos um link de confirmação para o seu e-mail.
          <span className="font-medium text-orange-600"> Acesse sua caixa de entrada</span> e clique no link para ativar sua conta.
        </p>
        <p className="text-gray-500 text-sm">
          Não recebeu o e-mail? Verifique sua caixa de spam ou solicite um novo link de verificação.
        </p>
        <p className="text-gray-500 text-sm">
          Após a verificação, você será redirecionado automaticamente para o painel.
        </p>
        <Link
          href="/"
          className="mt-4 bg-orange-600 hover:bg-orange-500 text-white font-semibold py-2 px-6 rounded-full transition cursor-pointer"
        >
          Voltar para o início
        </Link>
      </div>
    </div>
  )
}

export default EmailVerification
