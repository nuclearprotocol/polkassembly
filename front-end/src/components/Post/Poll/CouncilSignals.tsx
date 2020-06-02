// Copyright 2019-2020 @paritytech/polkassembly authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import styled from '@xstyled/styled-components';
import React, { useEffect, useState } from 'react';
import { Grid, Icon } from 'semantic-ui-react';
import { chainProperties } from 'src/global/networkConstants';
import HelperTooltip from 'src/ui-components/HelperTooltip';
import getNetwork from 'src/util/getNetwork';

import { PostVotesQuery, useCouncilAtBlockNumberQuery, useGet_Current_Block_NumberQuery } from '../../../generated/graphql';
import { OffchainVote, Vote } from '../../../types';
import Address from '../../../ui-components/Address';
import Card from '../../../ui-components/Card';
import CouncilSignalBar from '../../../ui-components/CouncilSignalBar';
import getDefaultAddressField from '../../../util/getDefaultAddressField';
import getEncodedAddress from '../../../util/getEncodedAddress';

interface Props {
	className?: string
	data?: PostVotesQuery | undefined
	blockNumber?: number
}

const CouncilSignals = ({ className, blockNumber, data }: Props) => {
	const network = getNetwork();
	const [ayes, setAyes] = useState(0);
	const [nays, setNays] = useState(0);
	const [memberSet, setMemberSet] = useState<Set<string>>(new Set<string>());
	const [councilVotes, setCouncilVotes] = useState<OffchainVote[]>([]);
	const currentBlockNumber = useGet_Current_Block_NumberQuery();
	const councilAtPostBlockNumber = useCouncilAtBlockNumberQuery({ variables: { blockNumber: blockNumber || 0 } });
	const councilAtCurrentBlockNumber = useCouncilAtBlockNumberQuery({ variables: { blockNumber: currentBlockNumber?.data?.blockNumbers?.[0]?.number || 0 } });
	const TWO_WEEKS = chainProperties?.[network]?.twoWeeksBlocks;

	useEffect(() => {
		const currentBlock = currentBlockNumber?.data?.blockNumbers?.[0]?.number || 0;
		const pollClosingBlockNumber = (blockNumber || 0) + TWO_WEEKS;

		const memberSet = new Set<string>();

		if (pollClosingBlockNumber > currentBlock) {
			councilAtCurrentBlockNumber?.data?.councils?.[0]?.members?.forEach((member) => {
				const address = getEncodedAddress(member.address);
				if (address) {
					memberSet.add(address);
				}
			});
		} else {
			councilAtPostBlockNumber?.data?.councils?.[0]?.members?.forEach((member) => {
				const address = getEncodedAddress(member.address);

				if (address) {
					memberSet.add(address);
				}
			});
		}

		setMemberSet(memberSet);
	}, [blockNumber, currentBlockNumber, councilAtPostBlockNumber, councilAtCurrentBlockNumber, TWO_WEEKS]);

	useEffect(() => {
		let ayes = 0;
		let nays = 0;
		const defaultAddressField = getDefaultAddressField();
		const councilVotes: OffchainVote[]  = [];

		data?.post_votes?.forEach(({ vote, voter }) => {
			const defaultAddress = voter?.[defaultAddressField];

			if (defaultAddress && memberSet.has(defaultAddress)) {
				const address = getEncodedAddress(defaultAddress);
				if (address) {
					councilVotes.push({
						address,
						vote
					});
				}

				if (vote === Vote.AYE) {
					ayes++;
				}

				if (vote === Vote.NAY) {
					nays++;
				}
			}
		});

		setAyes(ayes);
		setNays(nays);
		setCouncilVotes(councilVotes);
	}, [data, memberSet]);

	return (
		<Card className={className}>
			<h3>Council Signals <HelperTooltip content='This represents the off-chain votes of council members'/></h3>
			<CouncilSignalBar
				ayeSignals={ayes}
				councilSize={memberSet.size}
				naySignals={nays}
			/>
			<Grid className='council-votes'>
				{councilVotes.map(councilVote =>
					<Grid.Row key={councilVote.address}>
						<Grid.Column width={12}>
							<div className='item'>
								<Address address={councilVote.address} />
							</div>
						</Grid.Column>
						<Grid.Column width={4}>
							{councilVote.vote === Vote.AYE ? <>
								<div className='thumbs up'>
									<Icon name='thumbs up' />
								</div> Aye
							</> : <>
								<div className='thumbs down'>
									<Icon name='thumbs down' />
								</div> Nay
							</>}
						</Grid.Column>
					</Grid.Row>
				)}
			</Grid>
		</Card>
	);
};

export default styled(CouncilSignals)`
	.council-votes {
		margin-top: 2em;
	}
	.thumbs {
		display: inline-block;
		text-align: center;
		vertical-align: middle;
		color: white;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		font-size: 1rem;
	}

	.thumbs.up {
		background-color: green_primary;
	}

	.thumbs.down {
		background-color: red_primary;
	}
`;