/**
 * Centralised error mapper for wallet errors and ShipRegistry custom errors.
 */

import { BaseError, ContractFunctionRevertedError } from 'viem'

/** Friendly messages for ShipRegistry custom errors */
const CONTRACT_ERROR_MESSAGES: Record<string, string> = {
  AlreadyShipped: 'This contract is already in the registry.',
  WrongFee: 'The fee changed — please refresh and try again.',
  IsPaused: 'Registrations are paused for maintenance. Try again later.',
  NotAContract: 'That address has no deployed contract. Double-check the address.',
  ZeroAddress: 'Address cannot be zero.',
  InvalidName: 'Project name must be 1–64 characters.',
  InvalidCategory: 'Category must be 32 characters or fewer.',
  InvalidUrl: 'URL must be between 1 and 200 characters.',
  NotBuilder: 'Only the original builder can update this ship.',
  UnknownShip: 'No ship found with that ID.',
  NotOwner: 'Only the registry owner can do that.',
  Reentrancy: 'Reentrancy detected — please try again.',
  FeeTransferFailed: 'Fee transfer to treasury failed. The treasury address may be invalid.',
  FeeTooHigh: 'Fee exceeds the maximum allowed (10 USDC).',
}

export function parseContractError(error: unknown): string {
  if (error instanceof BaseError) {
    // Try to extract a custom error name from ContractFunctionRevertedError
    const revertError = error.walk((e) => e instanceof ContractFunctionRevertedError)
    if (revertError instanceof ContractFunctionRevertedError) {
      const name = revertError.data?.errorName ?? ''
      if (name && CONTRACT_ERROR_MESSAGES[name]) return CONTRACT_ERROR_MESSAGES[name]
      if (name) return `Contract error: ${name}`
    }

    // Walk the message for known patterns
    const msg = error.message.toLowerCase()
    if (msg.includes('user rejected') || msg.includes('user denied') || error.name === 'UserRejectedRequestError') {
      return '' // User rejection is not an error — caller can treat empty string as cancelled
    }
    if (msg.includes('insufficient funds') || msg.includes('exceeds balance')) {
      return 'Insufficient USDC balance. You need more USDC on this network.'
    }
    if (msg.includes('already shipped')) return CONTRACT_ERROR_MESSAGES.AlreadyShipped
    if (msg.includes('wrong fee')) return CONTRACT_ERROR_MESSAGES.WrongFee
    if (msg.includes('is paused')) return CONTRACT_ERROR_MESSAGES.IsPaused
    if (msg.includes('not a contract')) return CONTRACT_ERROR_MESSAGES.NotAContract
    if (
      msg.includes('http request failed') ||
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('fetch failed')
    ) {
      return (
        'Your wallet could not reach the Arc network. ' +
        'Check the wallet health banner at the top of the page — ' +
        'your wallet may be using an outdated RPC URL.'
      )
    }
    if (msg.includes('network') || msg.includes('timeout') || msg.includes('rpc')) {
      return 'Network error. Check your connection and try again.'
    }
    // Surface the short message if nothing else matched
    if (error.shortMessage) return error.shortMessage
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('user rejected') || msg.includes('user denied')) return ''
    if (
      msg.includes('http request failed') ||
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('fetch failed')
    ) {
      return (
        'Your wallet could not reach the Arc network. ' +
        'Check the wallet health banner at the top of the page — ' +
        'your wallet may be using an outdated RPC URL.'
      )
    }
    return error.message
  }

  return 'Something went wrong. Please try again.'
}

/** Returns true if the error is a user rejection (not a real error — just reset state). */
export function isUserRejection(error: unknown): boolean {
  if (error instanceof BaseError) {
    if (error.name === 'UserRejectedRequestError') return true
    const msg = error.message.toLowerCase()
    return msg.includes('user rejected') || msg.includes('user denied')
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return msg.includes('user rejected') || msg.includes('user denied')
  }
  return false
}
