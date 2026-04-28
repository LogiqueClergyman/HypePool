use soroban_sdk::{contracttype, Address, Env};
use crate::types::{BetInfo, MarketConfig, MarketState};

const TTL_BUMP: u32 = 518_400;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Config,
    State,
    YesBet(Address),
    NoBet(Address),
    Claimed(Address),
    FeeCollected,
}

pub fn has_config(env: &Env) -> bool {
    env.storage().persistent().has(&DataKey::Config)
}

pub fn get_config(env: &Env) -> MarketConfig {
    env.storage().persistent().get(&DataKey::Config).unwrap()
}

pub fn set_config(env: &Env, config: &MarketConfig) {
    env.storage().persistent().set(&DataKey::Config, config);
    env.storage().persistent().extend_ttl(&DataKey::Config, TTL_BUMP, TTL_BUMP);
}

pub fn get_state(env: &Env) -> MarketState {
    env.storage().persistent().get(&DataKey::State).unwrap()
}

pub fn set_state(env: &Env, state: &MarketState) {
    env.storage().persistent().set(&DataKey::State, state);
    env.storage().persistent().extend_ttl(&DataKey::State, TTL_BUMP, TTL_BUMP);
}

pub fn get_yes_bet(env: &Env, user: &Address) -> Option<BetInfo> {
    env.storage().persistent().get(&DataKey::YesBet(user.clone()))
}

pub fn set_yes_bet(env: &Env, user: &Address, info: &BetInfo) {
    let key = DataKey::YesBet(user.clone());
    env.storage().persistent().set(&key, info);
    env.storage().persistent().extend_ttl(&key, TTL_BUMP, TTL_BUMP);
}

pub fn get_no_bet(env: &Env, user: &Address) -> Option<BetInfo> {
    env.storage().persistent().get(&DataKey::NoBet(user.clone()))
}

pub fn set_no_bet(env: &Env, user: &Address, info: &BetInfo) {
    let key = DataKey::NoBet(user.clone());
    env.storage().persistent().set(&key, info);
    env.storage().persistent().extend_ttl(&key, TTL_BUMP, TTL_BUMP);
}

pub fn has_claimed(env: &Env, user: &Address) -> bool {
    env.storage().persistent().get(&DataKey::Claimed(user.clone())).unwrap_or(false)
}

pub fn set_claimed(env: &Env, user: &Address) {
    let key = DataKey::Claimed(user.clone());
    env.storage().persistent().set(&key, &true);
    env.storage().persistent().extend_ttl(&key, TTL_BUMP, TTL_BUMP);
}

pub fn get_fee_collected(env: &Env) -> i128 {
    env.storage().persistent().get(&DataKey::FeeCollected).unwrap_or(0)
}

pub fn set_fee_collected(env: &Env, amount: i128) {
    env.storage().persistent().set(&DataKey::FeeCollected, &amount);
    env.storage().persistent().extend_ttl(&DataKey::FeeCollected, TTL_BUMP, TTL_BUMP);
}
