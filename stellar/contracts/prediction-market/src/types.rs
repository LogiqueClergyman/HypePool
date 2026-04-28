use soroban_sdk::{contracttype, Address, String};

#[contracttype]
#[derive(Clone, Debug)]
pub struct BetInfo {
    pub amount: i128,           // raw bet amount (used for refunds, display)
    pub weighted_amount: i128,  // time-weighted amount (used for payout calculation)
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ContentType {
    YouTube = 0,
    Twitter = 1,
    Instagram = 2,
    TikTok = 3,
    Other = 4,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Metric {
    Views = 0,
    Likes = 1,
    Comments = 2,
    Shares = 3,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Outcome {
    Unresolved = 0,
    Yes = 1,
    No = 2,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct MarketConfig {
    pub content_url: String,
    pub content_type: ContentType,
    pub metric: Metric,
    pub threshold: u64,
    pub deadline: u64,
    pub resolution_deadline: u64,
    pub min_bet: i128,
    pub token: Address,
    pub oracle: Address,
    pub creator: Address,
    pub platform_fee_bps: u32,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct MarketState {
    pub yes_pool: i128,
    pub no_pool: i128,
    pub yes_weighted_pool: i128,
    pub no_weighted_pool: i128,
    pub outcome: Outcome,
    pub total_bettors: u32,
}
