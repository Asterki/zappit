module.exports = {
	subject: 'Verify your email address',
	html: `
	<div style="text-align: center">
	<div class="main">
		<h1>Zappit Email Verification Code</h1>
		<p>Hello {username}, we've received a request from you to verify your email</p>

		<h1>Your verification code is: {verification_code}</h1>
	</div>

	<div class="footer">
		<p>If you didn't request this email, please ignore it.</p>

		<span>
			<a style="text-decoration: none;" href="https://zappit.gg/support/tos">Terms of service</a> |
			<a  style="text-decoration: none;" href="https://zappit.gg/support/privacy">Privacy policy</a> |
			<a style="text-decoration: none;" href="https://zappit.gg/support/contact">Contact us</a>
		</span>
	</div>
</div>

`,
	text: `Hello username_placeholder, we've received a request from you to verify your email`,
};
