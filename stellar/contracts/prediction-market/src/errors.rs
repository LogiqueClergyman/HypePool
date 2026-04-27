use soroban_sdk::contracterror;

#[contracterror]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MarketError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    BettingClosed = 3,
    BelowMinBet = 4,
    MarketNotResolved = 5,
    MarketAlreadyResolved = 6,
    NotOracle = 7,
    NothingToClaim = 8,
    AlreadyClaimed = 9,
    NotRefundable = 10,
    NothingToRefund = 11,
    InvalidOutcome = 12,
    InvalidConfig = 13,
    ResolutionWindowNotOpen = 14,
}
