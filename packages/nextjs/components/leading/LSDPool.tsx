import type { FunctionComponent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "~~/components/common/icons";
import { realms } from "~~/configs/pool";
import { useRealm } from "~~/hooks/useRealm";
import { amountDesc } from "~~/utils/amount";

const LSDPool: FunctionComponent = () => {
  const defaultPool = realms.find(item => {
    return item.id === "lsd";
  })!;
  const { realm } = useRealm(defaultPool.id);

  const netAPY = realm.netAPY ? realm.netAPY.multipliedBy(100).toNumber() : 0;
  const deposit = realm.deposit ? amountDesc(realm.deposit, 2) : 0;
  const totalSupply = amountDesc(realm.totalSupply, 0);
  const totalBorrow = amountDesc(realm.totalBorrow, 0);

  return (
    <div className="flex flex-col items-center mx-4">
      <Link href={`/realms/${defaultPool.id}`}>
        <div className="mt-7 bg-white/80 rounded-lg sm:w-[872px] px-4 sm:px-8 py-7 pb-[43px] action relative">
          <div className="absolute top-[23px] w-[93px] h-8 right-[29px] flex items-center justify-center bg-[#1B2736] rounded-2xl text-white/80 text-sm">
            Isolated
          </div>
          <div className="flex items-start">
            <div className="border w-[47px] h-[47px] border-[#9CA3AF] rounded-[10px] bg-white flex items-center justify-center">
              <Image alt="pool icon" src={defaultPool.icon} width={32} height={32}></Image>
            </div>

            <div className="flex flex-col ml-[18px] mt-2 ">
              <div className="flex items-center">
                <div className="text-2xl font-medium text-dark2">{defaultPool.name}</div>
                <ArrowRightIcon className="ml-[10px]"></ArrowRightIcon>
              </div>

              <div className="text-[#606060] mt-2">Dedicated realm for Liquid Staking Derivatives (LSD).</div>
              <div className="flex items-center gap-2 w-fit mt-[13px]">
                {realm?.markets?.map(market => {
                  const cToken = realm[market.address];
                  if (!cToken?.token?.icon) {
                    return null;
                  }
                  return (
                    <img
                      key={market.cToken}
                      className="w-7 h-auto object-contain rounded-full"
                      src={cToken?.token?.icon}
                      alt="Img"
                    />
                  );
                })}
              </div>
              <div className="w-full flex flex-wrap mt-8 gap-[50px] leading-none">
                <div className="flex flex-col">
                  <span className="text-[18px]">Total Supply</span>
                  <div className={`text-[36px] font-bold number mt-[14px]`}>${totalSupply}</div>
                </div>
                <div className="flex flex-col ">
                  <span className="text-[18px]">Total Borrow</span>
                  <div className="text-[36px] font-bold number mt-[14px]">${totalBorrow}</div>
                </div>
                <div>
                  <div className="text-[18px]">Your Net APY</div>
                  <div className={`text-[36px] font-bold number  mt-[14px] ${netAPY <= 0 ? "text-green" : ""}`}>
                    {netAPY.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-[18px]">Amount Deposited</div>
                  <div className="text-[36px] font-bold  mt-[14px] number">${deposit}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default LSDPool;
