import { Address, BigDecimal, BigInt } from '@graphprotocol/graph-ts'

export const NULL_CALL_RESULT_VALUE =
  "0x0000000000000000000000000000000000000000000000000000000000000001";

export const ADDRESS_ZERO = Address.fromString('0x0000000000000000000000000000000000000000')

export const BIG_DECIMAL_1E12 = BigDecimal.fromString('1e12')

export const BIG_DECIMAL_1E18 = BigDecimal.fromString('1e18')

export const BIG_DECIMAL_1E6 = BigDecimal.fromString('1e6')

export const BIG_DECIMAL_ZERO = BigDecimal.fromString('0')

export const BIG_DECIMAL_ONE = BigDecimal.fromString("1")

export const BIG_INT_ONE = BigInt.fromI32(1);

export const BIG_INT_ONE_DAY_SECONDS = BigInt.fromI32(86400)

export const BIG_INT_ZERO = BigInt.fromI32(0)

export const MASTER_CHEF_ADDRESS = Address.fromString('0x557691633CFf6ad68393b33051Cb25b3194d336B')

export const MINI_CHEF_ADDRESS = Address.fromString('0x9870116bB2B63a09b065B5033f7ff18754B9E4Af')

export const FACTORY_ADDRESS = Address.fromString("0x27C0dF6b874f0768B687C95367b826D9948fa086");

export const ACC_SUNI_PRECISION = BigInt.fromI32(10750000)

export const SUNI_BAR_ADDRESS = Address.fromString('0x065C13f1999827824dcc255049e815D8eb75769A')

export const SUNI_TOKEN_ADDRESS = Address.fromString('0x3A49360098cF9061630211874398EC75704C0595')

export const SUNI_ETH_PAIR_ADDRESS = Address.fromString('0x686530b6f6786898872888b76575ce647d3fd778')

// minimum liquidity required to count towards tracked volume for pairs with small # of Lps
export const MINIMUM_USD_THRESHOLD_NEW_PAIRS = BigDecimal.fromString(
    "3000"
);

// minimum liquidity for price to get tracked
export const MINIMUM_LIQUIDITY_THRESHOLD_ETH = BigDecimal.fromString(
    "20"
);


  export const USDC_WETH_PAIR = "0x397ff1542f962076d0bfe58ea045ffa2d347aca0";

  export const DAI_WETH_PAIR = "0xc3d03e4f041fd4cd388c549ee2a29a9e5075882f";
  
  export const USDT_WETH_PAIR = "0x06da0fd433c1a5d7a4faa01111c044910a184553";
  
  export const SUNI_WETH_PAIR = "0x686530b6f6786898872888b76575ce647d3fd778";

  export const WETH_ADDRESS = Address.fromString("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2");
