/**
 * @deprecated prefer mocking the email transport directly in new tests.
 */
export function mock() {
  // mock the email system
  const sendMailMock = jest.fn()
  const nodemailer = require("nodemailer")
  nodemailer.createTransport.mockReturnValue({
    sendMail: sendMailMock,
    verify: jest.fn(),
  })
  return sendMailMock
}
