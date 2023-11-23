// https://docs.convexfinance.com/convexfinanceintegration/cvx-minting
// taken from here

const cliffSize = BigInt(100000 * 1e18) //new cliff every 100,000 tokens
const cliffCount = BigInt(1000) // 1,000 cliffs
const maxSupply = BigInt(100000000 * 1e18) //100 mil max supply

export function GetCVXMintAmount(crvEarned: bigint, cvxTotalSupply: bigint) {
  //get current cliff
  const currentCliff = cvxTotalSupply / cliffSize

  //if current cliff is under the max
  if (currentCliff < cliffCount) {
    //get remaining cliffs
    const remaining = cliffCount - currentCliff

    //multiply ratio of remaining cliffs to total cliffs against amount CRV received
    var cvxEarned = (crvEarned * remaining) / cliffCount

    //double check we have not gone over the max supply
    var amountTillMax = maxSupply - cvxTotalSupply
    if (cvxEarned > amountTillMax) {
      cvxEarned = amountTillMax
    }
    return cvxEarned
  }
  return 0n
}
