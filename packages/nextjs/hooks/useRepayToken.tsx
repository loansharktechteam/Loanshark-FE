import { useCallback, useEffect } from "react";
import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { useContractRead, useContractWrite, useWaitForTransaction } from "wagmi";
import { useAccount } from "~~/hooks/useAccount";
import { Market, Realm } from "~~/hooks/useRealm";
import * as toast from "~~/services/toast";
import store, { actions, useTypedSelector } from "~~/stores";
import { TradeStep } from "~~/stores/reducers/trade";
import { ContractName } from "~~/utils/scaffold-eth/contract";
import { switchNetwork } from "~~/wagmi/actions";

export function useRepayToken(realm: Realm, market: Market) {
  const marketData = realm[market.address];
  const { isLogin, login, address, chain } = useAccount();

  const tradeData = useTypedSelector(state => {
    return state.trade.repay;
  });

  const tokenContract = realm.contract.contracts[market.token as ContractName];
  const cTokenContract = realm.contract.contracts[market.cToken as ContractName];
  const maximillionContract = realm.contract.contracts.Maximillion;

  const { data: approveAllowance, refetch } = useContractRead({
    ...tokenContract,
    functionName: "allowance",
    chainId: parseInt(realm.contract.chainId),
    args: [address, marketData?.address],
    watch: true,
  } as any);

  const decimals = new BigNumber(10).pow(marketData?.token?.decimals || 18);

  const approveAllowanceAmount = new BigNumber((approveAllowance as any)?.toString() || 0).div(decimals);

  const { writeAsync: _tokenApprove } = useContractWrite({
    mode: "recklesslyUnprepared",
    ...tokenContract,
    functionName: "approve",
    chainId: parseInt(realm.contract.chainId),
    args: [
      marketData?.address,
      ethers.utils.parseUnits(
        tradeData.amount?.multipliedBy(1.01).toFixed(marketData?.token?.decimals || 18, BigNumber.ROUND_FLOOR) || "0",
        marketData?.token?.decimals || 18,
      ),
    ],
  } as any);

  const { status: approveTransStatus } = useWaitForTransaction({
    hash: tradeData.approveTx as any,
    chainId: parseInt(realm.contract.chainId),
  });

  const { writeAsync: tokenRepay } = useContractWrite({
    mode: "recklesslyUnprepared",
    ...cTokenContract,
    functionName: "repayBorrow",
    chainId: parseInt(realm.contract.chainId),
    args: tokenContract
      ? [
          ethers.utils.parseUnits(
            tradeData.amount?.toFixed(marketData?.token?.decimals || 18, BigNumber.ROUND_FLOOR) || "0",
            marketData?.token?.decimals || 18,
          ),
        ]
      : [],
  } as any);

  const { writeAsync: ethRepay } = useContractWrite({
    mode: "recklesslyUnprepared",
    ...maximillionContract,
    functionName: "repayBehalfExplicit",
    chainId: parseInt(realm.contract.chainId),
    args: [address, market.address],
  } as any);

  const { status: minteTransStatus } = useWaitForTransaction({
    hash: tradeData.executeTx as any,
    chainId: parseInt(realm.contract.chainId),
  });

  const repay = useCallback(
    async (amount: BigNumber, isMax: boolean) => {
      if (!isLogin) {
        return login();
      }

      if (!tokenRepay || !ethRepay) {
        return;
      }
      try {
        store.dispatch(
          actions.trade.updateRepay({
            executing: true,
            executeError: undefined,
            executeTx: undefined,
            stepIndex: TradeStep.EXECUTE,
          }),
        );
        if (chain?.id !== realm.config?.key) {
          await switchNetwork({
            chainId: realm.config?.key as number,
          });
        }
        let res;
        console.log("debug:", isMax, amount.toString(), tokenContract);
        if (tokenContract) {
          res = await tokenRepay({
            recklesslySetUnpreparedArgs: [
              amount.isEqualTo(new BigNumber(-1))
                ? "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
                : ethers.utils.parseUnits(
                    amount.toFixed(marketData?.token?.decimals || 18, BigNumber.ROUND_FLOOR),
                    marketData?.token?.decimals || 18,
                  ),
            ],
          });
        } else {
          if (isMax) {
            res = await ethRepay({
              recklesslySetUnpreparedOverrides: {
                value: ethers.utils.parseUnits(
                  amount.multipliedBy(1.01).toFixed(marketData?.token?.decimals || 18, BigNumber.ROUND_FLOOR),
                  marketData?.token?.decimals || 18,
                ),
              },
            });
          } else {
            res = await ethRepay({
              recklesslySetUnpreparedOverrides: {
                value: ethers.utils.parseUnits(
                  amount.toFixed(marketData?.token?.decimals || 18, BigNumber.ROUND_FLOOR),
                  marketData?.token?.decimals || 18,
                ),
              },
            });
          }
        }

        store.dispatch(
          actions.trade.updateRepay({
            executeTx: res.hash,
          }),
        );
        const transReceipt = await res.wait();
        if (transReceipt.status === 0) {
          throw new Error("Execute fail");
        }
        store.dispatch(
          actions.trade.updateRepay({
            stepIndex: TradeStep.ENTER_AMOUNT,
          }),
        );
        await new Promise(resolve => {
          setTimeout(resolve, 3000);
        });
        toast.success("Repay success");
      } catch (e: any) {
        store.dispatch(
          actions.trade.updateRepay({
            executeError: e.message,
            stepIndex: TradeStep.ENTER_AMOUNT,
          }),
        );
        toast.error(e.message);
        throw new Error(e.message);
      } finally {
        store.dispatch(
          actions.trade.updateRepay({
            executing: false,
          }),
        );
      }
    },
    [isLogin, tokenRepay, login, tokenContract, market, ethRepay, chain, realm],
  );

  const approveToken = useCallback(async () => {
    if (!isLogin) {
      return login();
    }
    if (!_tokenApprove) {
      return;
    }
    if (!tradeData.amount) {
      return;
    }
    try {
      store.dispatch(
        actions.trade.updateRepay({
          approving: true,
          approveError: undefined,
          approveTx: undefined,
          stepIndex: TradeStep.APPROVE,
        }),
      );
      if (chain?.id !== realm.config?.key) {
        await switchNetwork({
          chainId: realm.config?.key as number,
        });
      }
      const res = await _tokenApprove();
      actions.trade.updateRepay({
        approveTx: res.hash,
      });
      const transReceipt = await res.wait();
      if (transReceipt.status === 0) {
        throw new Error("Approve fail");
      }
      store.dispatch(
        actions.trade.updateRepay({
          stepIndex: TradeStep.EXECUTE,
        }),
      );
      await refetch();
    } catch (e: any) {
      store.dispatch(
        actions.trade.updateRepay({
          approveError: e.message,
          stepIndex: TradeStep.ENTER_AMOUNT,
        }),
      );
      toast.error(e.message);
      throw new Error(e.message);
    } finally {
      store.dispatch(
        actions.trade.updateRepay({
          approving: false,
        }),
      );
    }
  }, [isLogin, _tokenApprove, login, tokenContract, tradeData.amount, refetch, chain, realm]);

  useEffect(() => {
    if (approveTransStatus === "error") {
      store.dispatch(
        actions.trade.updateRepay({
          approveError: "Approve fail",
          stepIndex: TradeStep.ENTER_AMOUNT,
        }),
      );
    }
  }, [approveTransStatus]);

  useEffect(() => {
    if (minteTransStatus === "error") {
      store.dispatch(
        actions.trade.updateRepay({
          approveError: "Execute fail",
          stepIndex: TradeStep.ENTER_AMOUNT,
        }),
      );
    } else if (minteTransStatus === "success") {
      store.dispatch(
        actions.trade.updateRepay({
          stepIndex: TradeStep.ENTER_AMOUNT,
        }),
      );
    }
  }, [minteTransStatus]);

  return {
    ...tradeData,
    approveToken,
    repay,
    approveAllowanceAmount,
    isNativeToken: !tokenContract,
  };
}
