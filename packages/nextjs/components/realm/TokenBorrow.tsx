import { FunctionComponent, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button, Input, LoadingOverlay, Select } from "@mantine/core";
import BigNumber from "bignumber.js";
import { useBorrowToken } from "~~/hooks/useBorrowToken";
import type { Market, Realm } from "~~/hooks/useRealm";
import store, { actions } from "~~/stores";
import { amountDecimal, amountDesc } from "~~/utils/amount";
import { p18 } from "~~/utils/amount";

const TokenBorrow: FunctionComponent<{
  market: Market;
  onChangeMarket: any;
  realm: Realm;
}> = ({ realm, market, onChangeMarket }) => {
  const selectRef = useRef<any>();
  const marketData = realm[market.address];
  const tokenSelectList =
    realm.markets?.map(market => {
      const marketData = realm[market.address];
      return {
        icon: marketData!.token.icon,
        value: market.address,
        label: market.token,
      };
    }) || [];

  const borrowToken = useBorrowToken(realm, market);

  const amountPrice = new BigNumber(borrowToken.amount || 0)?.multipliedBy(marketData?.price || 0);
  const borrowLimitPrice = realm?.totalUserLimit || new BigNumber(0);
  const decimals = new BigNumber(10).pow(marketData?.token?.decimals || 18);

  const borrowAmount = marketData?.borrowBalanceStored?.div(decimals);
  const borrowPrice = borrowAmount?.multipliedBy(marketData?.price || 0);

  const totalBorrow = marketData?.totalBorrows?.div(decimals);
  const totalBorrowPrice = totalBorrow?.multipliedBy(marketData?.price || 0);
  const globalBorrowPrice = realm.totalUserBorrowed;
  const inputRef = useRef<HTMLInputElement>(null);

  const _C = new BigNumber(borrowToken.amount || 0).multipliedBy(marketData?.price || 0);

  const borrowUtilization1 = !borrowLimitPrice.eq(0)
    ? _C
        .plus(globalBorrowPrice || 0)
        .div(borrowLimitPrice)
        .multipliedBy(100)
        .toNumber()
    : 0;
  const borrowUtilization2 = !borrowLimitPrice.eq(0) ? _C.div(borrowLimitPrice).multipliedBy(100).toNumber() : 0;

  const borrowCaps = marketData?.borrowCaps?.div(p18) || new BigNumber(0);

  const borrowAPY = marketData?.tokenBorrowAPY?.multipliedBy(100).toNumber() || 0;

  const [maxAmount, setMaxAmount] = useState(new BigNumber(0));

  useEffect(() => {
    let maxAmount = marketData?.price ? realm.accountLiquidity?.[1]?.div(marketData.price) : new BigNumber(0);
    if (maxAmount?.isLessThan(0.0001)) {
      maxAmount = new BigNumber(0);
    }
    setMaxAmount(maxAmount || new BigNumber(0));
  }, [marketData?.price?.toString(), realm.accountLiquidity?.[1]?.toString()]);

  const changeAmount = useCallback((amount: BigNumber | undefined | "") => {
    store.dispatch(
      actions.trade.updateBorrow({
        amount: amount || undefined,
      }),
    );
  }, []);

  const isInsufficientBalance = borrowToken.amount?.isGreaterThan(maxAmount);
  const isInvalidInput = borrowToken.amount?.isLessThan(0);
  const cash = marketData?.cash?.div(decimals) || new BigNumber(0);
  const isInsufficientLiquidity = borrowToken.amount?.isGreaterThan(cash);

  if (!marketData) {
    return null;
  }

  return (
    <div className="relative">
      <LoadingOverlay visible={borrowToken.executing} overlayBlur={2}></LoadingOverlay>
      <div className="flex items-center justify-between">
        <div className="font-bold text-xl"></div>
        <div className="flex items-center">
          <span className="text-sm text-[#3481BD] mr-2">
            Max: {maxAmount?.toFormat(amountDecimal(maxAmount), BigNumber.ROUND_FLOOR)} {market.token}
          </span>
          <div
            className="action font-extrabold text-[#3481BD]"
            onClick={() => {
              changeAmount(maxAmount.multipliedBy(0.8));
              if (inputRef.current) {
                inputRef.current.value = maxAmount.multipliedBy(0.8).toFixed(marketData?.token?.decimals || 18);
              }
            }}
          >
            80%
          </div>
        </div>
      </div>
      <div className="mt-2 flex gap-1 flex-col sm:flex-row sm:items-center">
        <Select
          size="lg"
          classNames={{
            input: "border-none bg-[#F0F5F9] rounded-[12px]",
            root: "sm:w-[145px]",
          }}
          styles={{ rightSection: { pointerEvents: "none" } }}
          value={market.address}
          data={tokenSelectList}
          onChange={onChangeMarket}
          rightSectionWidth={60}
          ref={selectRef}
          rightSection={
            <Image
              className="rounded-full"
              alt={marketData.token.name}
              src={marketData.token.icon}
              width={32}
              height={32}
            ></Image>
          }
        />
        <Input
          placeholder="0.00"
          classNames={{
            wrapper: "flex-1",
            input:
              "bg-[#F0F5F9] h-[50px] border-none bg-[#F0F5F9] rounded-[12px] text-lg font-bold placeholder:text-[#9CA3AF]",
          }}
          ref={inputRef}
          max={maxAmount?.toNumber()}
          defaultValue={borrowToken.amount?.toString()}
          type="number"
          onChange={e => {
            changeAmount(e.currentTarget.value ? new BigNumber(e.currentTarget.value) : undefined);
          }}
          styles={{ rightSection: { pointerEvents: "none" } }}
          rightSectionWidth={70}
          rightSection={<div className="flex items-center text-xs text-[#4E4E4E]">≈ ${amountDesc(amountPrice, 2)}</div>}
        ></Input>
      </div>
      <div className="h-[1px] bg-[#B1D2FE] mb-[10px] mt-6 "></div>
      <div className="rounded-lg bg-[#F0F6FA] border border-[#E3F2FF] p-5">
        <div className="flex items-center justify-between">
          <div>Borrow Limit</div>
          <div>${amountDesc(borrowLimitPrice, 2)}</div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div>Amount Borrowed</div>
          <div className="text-end">
            <div>{borrowAmount?.toFormat() !== "0" ? `${amountDesc(borrowAmount, 4)} ${market.token}` : "-.--"}</div>
            <div className="text-xs">${amountDesc(borrowPrice, 2)}</div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div>Borrow Utilization</div>
          <div className="text-[#039DED] font-bold">
            {borrowUtilization1.toFixed(2)}% [+{borrowUtilization2.toFixed(2)}%]
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div>Borrow Cap</div>
          <div>{borrowCaps.isEqualTo(0) ? "Unlimited" : amountDesc(borrowCaps.multipliedBy(100), 2)}</div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div>Total Borrow</div>
          <div className="text-end">
            <div className="">
              {amountDesc(totalBorrow, 4)} {market.token}
            </div>
            <div className="text-xs">${amountDesc(totalBorrowPrice, 2)}</div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div>Borrow APY</div>
          <div className="text-[#039DED] font-bold">{borrowAPY.toFixed(2)}%</div>
        </div>
      </div>

      {typeof borrowToken.amount === "undefined" ? (
        <Button
          className="w-full rounded-lg h-16 flex items-center justify-center bg-[#039DED] mt-[10px] text-lg text-white font-semibold action"
          disabled
        >
          Enter a Value
        </Button>
      ) : isInvalidInput ? (
        <Button
          className="w-full rounded-lg h-16 flex items-center justify-center bg-[#039DED] mt-[10px] text-lg text-white font-semibold action"
          disabled
        >
          Invalid Input
        </Button>
      ) : isInsufficientBalance ? (
        <Button
          className="w-full rounded-lg h-16 flex items-center justify-center bg-[#039DED] mt-[10px] text-lg text-white font-semibold action"
          disabled
        >
          Exceeded Borrow Limit
        </Button>
      ) : isInsufficientLiquidity ? (
        <Button
          className="w-full rounded-lg h-16 flex items-center justify-center bg-[#039DED] mt-[10px] text-lg text-white font-semibold action"
          disabled
        >
          Insufficient Liquidity
        </Button>
      ) : (
        <Button
          className="w-full rounded-lg h-16 flex items-center justify-center bg-[#039DED] mt-[10px] text-lg text-white font-semibold action"
          onClick={async () => {
            await borrowToken.borrow();
            setMaxAmount(maxAmount.minus(borrowToken.amount || 0));
          }}
        >
          Borrow
        </Button>
      )}
    </div>
  );
};

export default TokenBorrow;
