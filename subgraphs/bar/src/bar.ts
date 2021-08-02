import {
  ADDRESS_ZERO,
  BIG_DECIMAL_1E18,
  BIG_DECIMAL_1E6,
  BIG_DECIMAL_ZERO,
  BIG_INT_ZERO,
  SUNI_BAR_ADDRESS,
  SUNI_TOKEN_ADDRESS,
  SUNI_ETH_PAIR_ADDRESS,
} from './const'
import { Address, BigDecimal, BigInt, dataSource, ethereum, log } from '@graphprotocol/graph-ts'
import { Bar, History, User } from '../generated/schema'
import { Bar as BarContract, Transfer as TransferEvent } from '../generated/SuniBar/Bar'

import { Pair as PairContract } from '../generated/SuniBar/Pair'
import { SuniExchange as suexTokenContract } from '../generated/SuniBar/SuniExchange'

// TODO: Get averages of multiple suex stablecoin pairs
function getsuexPrice(): BigDecimal {
  const pair = PairContract.bind(SUNI_ETH_PAIR_ADDRESS)
  const reserves = pair.getReserves()
  return reserves.value1.toBigDecimal().times(BIG_DECIMAL_1E18).div(reserves.value0.toBigDecimal()).div(BIG_DECIMAL_1E6)
}

function createBar(block: ethereum.Block): Bar {
  const contract = BarContract.bind(dataSource.address())
  const bar = new Bar(dataSource.address().toHex())
  bar.decimals = contract.decimals()
  bar.name = contract.name()
  bar.suex = contract.SUWP()
  bar.symbol = contract.symbol()
  bar.totalSupply = BIG_DECIMAL_ZERO
  bar.suexStaked = BIG_DECIMAL_ZERO
  bar.suexStakedUSD = BIG_DECIMAL_ZERO
  bar.suexHarvested = BIG_DECIMAL_ZERO
  bar.suexHarvestedUSD = BIG_DECIMAL_ZERO
  bar.xSuniMinted = BIG_DECIMAL_ZERO
  bar.xSuniBurned = BIG_DECIMAL_ZERO
  bar.xSuniAge = BIG_DECIMAL_ZERO
  bar.xSuniAgeDestroyed = BIG_DECIMAL_ZERO
  bar.ratio = BIG_DECIMAL_ZERO
  bar.updatedAt = block.timestamp
  bar.save()

  return bar as Bar
}

function getBar(block: ethereum.Block): Bar {
  let bar = Bar.load(dataSource.address().toHex())

  if (bar === null) {
    bar = createBar(block)
  }

  return bar as Bar
}

function createUser(address: Address, block: ethereum.Block): User {
  const user = new User(address.toHex())

  // Set relation to bar
  user.bar = dataSource.address().toHex()

  user.xSuni = BIG_DECIMAL_ZERO
  user.xSuniMinted = BIG_DECIMAL_ZERO
  user.xSuniBurned = BIG_DECIMAL_ZERO

  user.suexStaked = BIG_DECIMAL_ZERO
  user.suexStakedUSD = BIG_DECIMAL_ZERO

  user.suexHarvested = BIG_DECIMAL_ZERO
  user.suexHarvestedUSD = BIG_DECIMAL_ZERO

  // In/Out
  user.xSuniOut = BIG_DECIMAL_ZERO
  user.suexOut = BIG_DECIMAL_ZERO
  user.usdOut = BIG_DECIMAL_ZERO

  user.xSuniIn = BIG_DECIMAL_ZERO
  user.suexIn = BIG_DECIMAL_ZERO
  user.usdIn = BIG_DECIMAL_ZERO

  user.xSuniAge = BIG_DECIMAL_ZERO
  user.xSuniAgeDestroyed = BIG_DECIMAL_ZERO

  user.xSuniOffset = BIG_DECIMAL_ZERO
  user.suexOffset = BIG_DECIMAL_ZERO
  user.usdOffset = BIG_DECIMAL_ZERO
  user.updatedAt = block.timestamp

  return user as User
}

function getUser(address: Address, block: ethereum.Block): User {
  let user = User.load(address.toHex())

  if (user === null) {
    user = createUser(address, block)
  }

  return user as User
}

function getHistory(block: ethereum.Block): History {
  const day = block.timestamp.toI32() / 86400

  const id = BigInt.fromI32(day).toString()

  let history = History.load(id)

  if (history === null) {
    const date = day * 86400
    history = new History(id)
    history.date = date
    history.timeframe = 'Day'
    history.suexStaked = BIG_DECIMAL_ZERO
    history.suexStakedUSD = BIG_DECIMAL_ZERO
    history.suexHarvested = BIG_DECIMAL_ZERO
    history.suexHarvestedUSD = BIG_DECIMAL_ZERO
    history.xSuniAge = BIG_DECIMAL_ZERO
    history.xSuniAgeDestroyed = BIG_DECIMAL_ZERO
    history.xSuniMinted = BIG_DECIMAL_ZERO
    history.xSuniBurned = BIG_DECIMAL_ZERO
    history.xSuniSupply = BIG_DECIMAL_ZERO
    history.ratio = BIG_DECIMAL_ZERO
  }

  return history as History
}

export function transfer(event: TransferEvent): void {
  // Convert to BigDecimal with 18 places, 1e18.
  const value = event.params.value.divDecimal(BIG_DECIMAL_1E18)

  // If value is zero, do nothing.
  if (value.equals(BIG_DECIMAL_ZERO)) {
    log.warning('Transfer zero value! Value: {} Tx: {}', [
      event.params.value.toString(),
      event.transaction.hash.toHex(),
    ])
    return
  }

  const bar = getBar(event.block)
  const barContract = BarContract.bind(SUNI_BAR_ADDRESS)

  const suexPrice = getsuexPrice()

  bar.totalSupply = barContract.totalSupply().divDecimal(BIG_DECIMAL_1E18)
  bar.suexStaked = suexTokenContract.bind(SUNI_TOKEN_ADDRESS)
    .balanceOf(SUNI_BAR_ADDRESS)
    .divDecimal(BIG_DECIMAL_1E18)
  bar.ratio = bar.suexStaked.div(bar.totalSupply)

  const what = value.times(bar.ratio)

  // Minted xSuni
  if (event.params.from == ADDRESS_ZERO) {
    const user = getUser(event.params.to, event.block)

    log.info('{} minted {} xSuni in exchange for {} suex - suexStaked before {} suexStaked after {}', [
      event.params.to.toHex(),
      value.toString(),
      what.toString(),
      user.suexStaked.toString(),
      user.suexStaked.plus(what).toString(),
    ])

    if (user.xSuni == BIG_DECIMAL_ZERO) {
      log.info('{} entered the bar', [user.id])
      user.bar = bar.id
    }

    user.xSuniMinted = user.xSuniMinted.plus(value)

    const suexStakedUSD = what.times(suexPrice)

    user.suexStaked = user.suexStaked.plus(what)
    user.suexStakedUSD = user.suexStakedUSD.plus(suexStakedUSD)

    const days = event.block.timestamp.minus(user.updatedAt).divDecimal(BigDecimal.fromString('86400'))

    const xSuniAge = days.times(user.xSuni)

    user.xSuniAge = user.xSuniAge.plus(xSuniAge)

    // Update last
    user.xSuni = user.xSuni.plus(value)

    user.updatedAt = event.block.timestamp

    user.save()

    const barDays = event.block.timestamp.minus(bar.updatedAt).divDecimal(BigDecimal.fromString('86400'))
    const barxSuni = bar.xSuniMinted.minus(bar.xSuniBurned)
    bar.xSuniMinted = bar.xSuniMinted.plus(value)
    bar.xSuniAge = bar.xSuniAge.plus(barDays.times(barxSuni))
    bar.suexStaked = bar.suexStaked.plus(what)
    bar.suexStakedUSD = bar.suexStakedUSD.plus(suexStakedUSD)
    bar.updatedAt = event.block.timestamp

    const history = getHistory(event.block)
    history.xSuniAge = bar.xSuniAge
    history.xSuniMinted = history.xSuniMinted.plus(value)
    history.xSuniSupply = bar.totalSupply
    history.suexStaked = history.suexStaked.plus(what)
    history.suexStakedUSD = history.suexStakedUSD.plus(suexStakedUSD)
    history.ratio = bar.ratio
    history.save()
  }

  // Burned xSuni
  if (event.params.to == ADDRESS_ZERO) {
    log.info('{} burned {} xSuni', [event.params.from.toHex(), value.toString()])

    const user = getUser(event.params.from, event.block)

    user.xSuniBurned = user.xSuniBurned.plus(value)

    user.suexHarvested = user.suexHarvested.plus(what)

    const suexHarvestedUSD = what.times(suexPrice)

    user.suexHarvestedUSD = user.suexHarvestedUSD.plus(suexHarvestedUSD)

    const days = event.block.timestamp.minus(user.updatedAt).divDecimal(BigDecimal.fromString('86400'))

    const xSuniAge = days.times(user.xSuni)

    user.xSuniAge = user.xSuniAge.plus(xSuniAge)

    const xSuniAgeDestroyed = user.xSuniAge.div(user.xSuni).times(value)

    user.xSuniAgeDestroyed = user.xSuniAgeDestroyed.plus(xSuniAgeDestroyed)

    // remove xSuniAge
    user.xSuniAge = user.xSuniAge.minus(xSuniAgeDestroyed)
    // Update xSuni last
    user.xSuni = user.xSuni.minus(value)

    if (user.xSuni == BIG_DECIMAL_ZERO) {
      log.info('{} left the bar', [user.id])
      user.bar = null
    }

    user.updatedAt = event.block.timestamp

    user.save()

    const barDays = event.block.timestamp.minus(bar.updatedAt).divDecimal(BigDecimal.fromString('86400'))
    const barxSuni = bar.xSuniMinted.minus(bar.xSuniBurned)
    bar.xSuniBurned = bar.xSuniBurned.plus(value)
    bar.xSuniAge = bar.xSuniAge.plus(barDays.times(barxSuni)).minus(xSuniAgeDestroyed)
    bar.xSuniAgeDestroyed = bar.xSuniAgeDestroyed.plus(xSuniAgeDestroyed)
    bar.suexHarvested = bar.suexHarvested.plus(what)
    bar.suexHarvestedUSD = bar.suexHarvestedUSD.plus(suexHarvestedUSD)
    bar.updatedAt = event.block.timestamp

    const history = getHistory(event.block)
    history.xSuniSupply = bar.totalSupply
    history.xSuniBurned = history.xSuniBurned.plus(value)
    history.xSuniAge = bar.xSuniAge
    history.xSuniAgeDestroyed = history.xSuniAgeDestroyed.plus(xSuniAgeDestroyed)
    history.suexHarvested = history.suexHarvested.plus(what)
    history.suexHarvestedUSD = history.suexHarvestedUSD.plus(suexHarvestedUSD)
    history.ratio = bar.ratio
    history.save()
  }

  // If transfer from address to address and not known xSuni pools.
  if (event.params.from != ADDRESS_ZERO && event.params.to != ADDRESS_ZERO) {
    log.info('transfered {} xSuni from {} to {}', [
      value.toString(),
      event.params.from.toHex(),
      event.params.to.toHex(),
    ])

    const fromUser = getUser(event.params.from, event.block)

    const fromUserDays = event.block.timestamp.minus(fromUser.updatedAt).divDecimal(BigDecimal.fromString('86400'))

    // Recalc xSuni age first
    fromUser.xSuniAge = fromUser.xSuniAge.plus(fromUserDays.times(fromUser.xSuni))
    // Calculate xSuniAge being transfered
    const xSuniAgeTranfered = fromUser.xSuniAge.div(fromUser.xSuni).times(value)
    // Subtract from xSuniAge
    fromUser.xSuniAge = fromUser.xSuniAge.minus(xSuniAgeTranfered)
    fromUser.updatedAt = event.block.timestamp

    fromUser.xSuni = fromUser.xSuni.minus(value)
    fromUser.xSuniOut = fromUser.xSuniOut.plus(value)
    fromUser.suexOut = fromUser.suexOut.plus(what)
    fromUser.usdOut = fromUser.usdOut.plus(what.times(suexPrice))

    if (fromUser.xSuni == BIG_DECIMAL_ZERO) {
      log.info('{} left the bar by transfer OUT', [fromUser.id])
      fromUser.bar = null
    }

    fromUser.save()

    const toUser = getUser(event.params.to, event.block)

    if (toUser.bar === null) {
      log.info('{} entered the bar by transfer IN', [fromUser.id])
      toUser.bar = bar.id
    }

    // Recalculate xSuni age and add incoming xSuniAgeTransfered
    const toUserDays = event.block.timestamp.minus(toUser.updatedAt).divDecimal(BigDecimal.fromString('86400'))

    toUser.xSuniAge = toUser.xSuniAge.plus(toUserDays.times(toUser.xSuni)).plus(xSuniAgeTranfered)
    toUser.updatedAt = event.block.timestamp

    toUser.xSuni = toUser.xSuni.plus(value)
    toUser.xSuniIn = toUser.xSuniIn.plus(value)
    toUser.suexIn = toUser.suexIn.plus(what)
    toUser.usdIn = toUser.usdIn.plus(what.times(suexPrice))

    const difference = toUser.xSuniIn.minus(toUser.xSuniOut).minus(toUser.xSuniOffset)

    // If difference of suex in - suex out - offset > 0, then add on the difference
    // in staked suex based on xSuni:suex ratio at time of reciept.
    if (difference.gt(BIG_DECIMAL_ZERO)) {
      const suex = toUser.suexIn.minus(toUser.suexOut).minus(toUser.suexOffset)
      const usd = toUser.usdIn.minus(toUser.usdOut).minus(toUser.usdOffset)

      log.info('{} recieved a transfer of {} xSuni from {}, suex value of transfer is {}', [
        toUser.id,
        value.toString(),
        fromUser.id,
        what.toString(),
      ])

      toUser.suexStaked = toUser.suexStaked.plus(suex)
      toUser.suexStakedUSD = toUser.suexStakedUSD.plus(usd)

      toUser.xSuniOffset = toUser.xSuniOffset.plus(difference)
      toUser.suexOffset = toUser.suexOffset.plus(suex)
      toUser.usdOffset = toUser.usdOffset.plus(usd)
    }

    toUser.save()
  }

  bar.save()
}
