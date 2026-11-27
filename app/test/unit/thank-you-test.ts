import assert from 'node:assert'
import { describe, it } from 'node:test'
import {
  hasUserAlreadyBeenCheckedOrThanked,
  updateLastThankYou,
} from '../../src/lib/thank-you'
import { ILastThankYou } from '../../src/models/last-thank-you'
import { Dispatcher } from '../../src/ui/dispatcher'

describe('thank-you', () => {
  describe('hasUserAlreadyBeenCheckedOrThanked', () => {
    it('returns false when lastThankYou is undefined', () => {
      assert.strictEqual(
        hasUserAlreadyBeenCheckedOrThanked(undefined, 'alice', '3.4.0'),
        false
      )
    })

    it('returns true when user was checked for the current version', () => {
      const lastThankYou: ILastThankYou = {
        version: '3.4.0',
        checkedUsers: ['alice', 'bob'],
      }
      assert.strictEqual(
        hasUserAlreadyBeenCheckedOrThanked(lastThankYou, 'alice', '3.4.0'),
        true
      )
    })

    it('returns false when version differs or user is not in checked list', () => {
      const lastThankYou: ILastThankYou = {
        version: '3.3.0',
        checkedUsers: ['alice'],
      }
      assert.strictEqual(
        hasUserAlreadyBeenCheckedOrThanked(lastThankYou, 'alice', '3.4.0'),
        false
      )
      assert.strictEqual(
        hasUserAlreadyBeenCheckedOrThanked(lastThankYou, 'charlie', '3.3.0'),
        false
      )
    })
  })

  describe('updateLastThankYou', () => {
    it('adds user to checkedUsers list for current version', () => {
      let saved: ILastThankYou | null = null
      const mockDispatcher = {
        setLastThankYou: (data: ILastThankYou) => {
          saved = data
        },
      } as unknown as Dispatcher

      const initial: ILastThankYou = {
        version: '3.4.0',
        checkedUsers: ['alice'],
      }

      updateLastThankYou(mockDispatcher, initial, 'bob', '3.4.0')
      assert.deepStrictEqual(saved, {
        version: '3.4.0',
        checkedUsers: ['alice', 'bob'],
      })
    })

    it('resets checkedUsers list when version changes', () => {
      let saved: ILastThankYou | null = null
      const mockDispatcher = {
        setLastThankYou: (data: ILastThankYou) => {
          saved = data
        },
      } as unknown as Dispatcher

      const initial: ILastThankYou = {
        version: '3.3.0',
        checkedUsers: ['alice', 'bob'],
      }

      updateLastThankYou(mockDispatcher, initial, 'charlie', '3.4.0')
      assert.deepStrictEqual(saved, {
        version: '3.4.0',
        checkedUsers: ['charlie'],
      })
    })
  })
})
