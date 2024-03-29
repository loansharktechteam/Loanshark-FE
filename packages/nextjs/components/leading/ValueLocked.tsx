import type { FunctionComponent } from "react";
import BigNumber from "bignumber.js";
import { useRealm } from "~~/hooks/useRealm";

const ValueLocked: FunctionComponent = () => {
  const { realm } = useRealm("main");
  const { realm: lsdRealm } = useRealm("lsd");

  const total = new BigNumber(0).plus(realm.totalValueLocked || 0).plus(lsdRealm.totalValueLocked || 0);

  return (
    <div className="flex flex-col items-center px-4">
      <div className="text-[#538EE4] font-semibold text-lg">Total Value Locked</div>
      <div className="mt-1 text-dark2 font-bold text-4xl sm:text-5xl ">${total.toFormat(2)}</div>
    </div>
  );
};

export default ValueLocked;
