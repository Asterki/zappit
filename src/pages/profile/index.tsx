/* eslint-disable @next/next/no-img-element */
import React from 'react';
// import axios from 'axios';
import { getLangFile } from '../../utils/pages';

import styles from '../../styles/profile/index.module.scss';
import type { NextPage, GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async (context: any) => {
	if (context.req.user == undefined)
		return {
			redirect: {
				destination: '/login',
				permanent: false,
			},
		};

	return {
		props: {
			host: process.env.HOST,
			lang: getLangFile(context.req.headers['accept-language'], 'profile', 'index'),
		},
	};
};

const Profile: NextPage = (props: any) => {
	return (
		<div className={styles['page']}>
			<h1>{props.lang.title}</h1>
		</div>
	);
};

export default Profile;
