import pactum from 'pactum';
import { SimpleReporter } from '../simple-reporter';
import { faker } from '@faker-js/faker';
import { StatusCodes } from 'http-status-codes';

describe('Restful Booker API', () => {
  const p = pactum;
  const rep = SimpleReporter;
  const baseUrl = 'https://restful-booker.herokuapp.com';

  let token = '';
  let bookingId = 0;

  const reserva = {
    firstname: faker.person.firstName(),
    lastname: faker.person.lastName(),
    totalprice: faker.number.int({ min: 100, max: 1000 }),
    depositpaid: true,
    bookingdates: {
      checkin: '2026-12-01',
      checkout: '2026-12-10'
    },
    additionalneeds: 'Breakfast'
  };

  const bookingSchema = {
    type: 'object',
    properties: {
      firstname: { type: 'string' },
      lastname: { type: 'string' },
      totalprice: { type: 'number' },
      depositpaid: { type: 'boolean' },
      bookingdates: {
        type: 'object',
        properties: {
          checkin: { type: 'string' },
          checkout: { type: 'string' }
        },
        required: ['checkin', 'checkout']
      }
    },
    required: [
      'firstname',
      'lastname',
      'totalprice',
      'depositpaid',
      'bookingdates'
    ]
  };

  p.request.setDefaultTimeout(90000);

  beforeAll(async () => {
    p.reporter.add(rep);

    token = await p
      .spec()
      .post(`${baseUrl}/auth`)
      .withJson({ username: 'admin', password: 'password123' })
      .expectStatus(StatusCodes.OK)
      .expectJsonSchema({
        type: 'object',
        properties: { token: { type: 'string' } },
        required: ['token']
      })
      .returns('token');
  });

  describe('Reservas', () => {
    it('Cria uma nova reserva', async () => {
      bookingId = await p
        .spec()
        .post(`${baseUrl}/booking`)
        .withHeaders('Accept', 'application/json')
        .withJson(reserva)
        .expectStatus(StatusCodes.OK)
        .expectJsonLike({ booking: reserva })
        .expectJsonSchema({
          type: 'object',
          properties: {
            bookingid: { type: 'number' },
            booking: bookingSchema
          },
          required: ['bookingid', 'booking']
        })
        .returns('bookingid');
    });

    it('Busca a reserva criada pelo id', async () => {
      await p
        .spec()
        .get(`${baseUrl}/booking/${bookingId}`)
        .withHeaders('Accept', 'application/json')
        .expectStatus(StatusCodes.OK)
        .expectJsonLike(reserva)
        .expectJsonSchema(bookingSchema);
    });

    it('Atualiza a reserva (PUT) com token', async () => {
      await p
        .spec()
        .put(`${baseUrl}/booking/${bookingId}`)
        .withHeaders('Accept', 'application/json')
        .withHeaders('Cookie', `token=${token}`)
        .withJson({ ...reserva, totalprice: 999, additionalneeds: 'Lunch' })
        .expectStatus(StatusCodes.OK)
        .expectJsonLike({ totalprice: 999, additionalneeds: 'Lunch' });
    });

    it('Não permite atualizar reserva sem token', async () => {
      await p
        .spec()
        .put(`${baseUrl}/booking/${bookingId}`)
        .withHeaders('Accept', 'application/json')
        .withJson(reserva)
        .expectStatus(StatusCodes.FORBIDDEN);
    });

    it('Exclui a reserva com token', async () => {
      await p
        .spec()
        .delete(`${baseUrl}/booking/${bookingId}`)
        .withHeaders('Cookie', `token=${token}`)
        .expectStatus(StatusCodes.CREATED);
    });
  });

  afterAll(() => p.reporter.end());
});
