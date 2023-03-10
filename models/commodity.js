'use strict';

const db = require('../db');
const { NotFoundError } = require('../expressError');
const { sqlForPartialUpdate } = require('../helpers/sql');
const { getCommodityId } = require('../helpers/commodityId');
const Ethylene = require('./ethylene');
const Respiration = require('./respiration');
const ShelfLife = require('./shelfLife');
const Temperature = require('./temperature');
const WindhamStudiesCommodities = require('./studiesCommodities');
const WindhamStudies = require('./studies');
const References = require('./references');

class Commodity {
	// Create a commodity (from data), update db, return new commodity data.
	// Data should be {id, commodityName, variety, scientificName, coolingMethod, climacteric}
	// Returns {id, commodityName, variety, scientificName, coolingMethod, climacteric}

	static async create(data) {
		if (!data.id) {
			data.id = getCommodityId(data.commodityName, data.variety);
		}
		const result = await db.query(
			`INSERT INTO commodities (id,
                                 commodity_name,
                                 variety,
                                 scientific_name,
                                 cooling_method,
                                 climacteric
                                 )
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING id, commodity_name AS "commodityName", variety, scientific_name AS "scientificName", cooling_method AS "coolingMethod", climacteric`,
			[
				data.id,
				data.commodityName,
				data.variety,
				data.scientificName,
				data.coolingMethod,
				data.climacteric
			]
		);
		const commodity = result.rows[0];

		return commodity;
	}

	/** Find all commodities.
   *
   * Returns [{ commodityName, variety, scientificName, coolingMethod, climacteric }, ...]
   **/

	static async findAll(searchFilters = {}) {
		let query = `SELECT id,commodity_name AS
		"commodityName", variety,
		scientific_name AS "scientificName", cooling_method AS "coolingMethod",
		climacteric
	   FROM commodities
	   `;
		let whereExpressions = [];
		let queryValues = [];

		const { commodityName } = searchFilters;

		if (commodityName) {
			queryValues.push(`%${commodityName}%`);
			whereExpressions.push(`commodity_name ILIKE $${queryValues.length}`);
		}

		if (whereExpressions.length > 0) {
			query += `WHERE ` + whereExpressions.join(' AND ');
		}

		query += ' ORDER BY commodity_name';

		const result = await db.query(query, queryValues);

		return result.rows;
	}

	/** Given a commodity id, return data about commodity.
	   *
	   * Returns { commodityName, variety, scientificName, coolingMethod, climacteric }
				where ethyleneSensitivity is [...{ id, commodityId, c2h4Productiom, c2h4Class, temperature  }]
				where respirationRate is [...{id, commodityId, rrRate, rrClass, temperature}]
				where shelfLife is [...{id, commodityId, temperature, shelfLife, packaging, descrpiption}]
				where temperatureRecommendations is [...{id, commodityId, minTemp, optimumTemp, description, rh}]
				where studies is [...{id, title, date, source, objective}]
				where refs is [...{commodityId, source}]

	   *
	   * Throws NotFoundError if commodity not found.
	   **/

	static async get(id) {
		const commodityRes = await db.query(
			`SELECT id, commodity_name AS
	        "commodityName", variety,
	        scientific_name AS "scientificName", cooling_method AS "coolingMethod",
	        climacteric
	       FROM commodities
	       WHERE id = $1`,
			[
				id
			]
		);

		const commodity = commodityRes.rows[0];

		if (!commodity) throw new NotFoundError(`No commodity: ${commodityRes}`);

		// return empty array if data does not exist
		const ethyleneData = (await Ethylene.getByCommodity(commodity.id)) || [];
		commodity.ethyleneSensitivity = ethyleneData;

		const respirationData = (await Respiration.getByCommodity(commodity.id)) || [];
		commodity.respirationRate = respirationData;

		const shelflLifeData = (await ShelfLife.getByCommodity(commodity.id)) || [];
		commodity.shelfLife = shelflLifeData;

		const temperatureData = (await Temperature.getByCommodity(commodity.id)) || [];
		commodity.temperatureRecommendations = temperatureData;

		const studyIds = (await WindhamStudiesCommodities.getByCommodityId(commodity.id)) || [];

		let studies = [];

		for (let id of studyIds) {
			const res = await WindhamStudies.getById(id.studyId);
			studies.push(res);
		}

		commodity.windhamStudies = studies || [];

		const references = (await References.getByCommodity(commodity.id)) || [];

		commodity.references = references;

		return commodity;
	}

	// Given a commodity id and data, updates a commodity

	static async update(id, data) {
		const { setCols, values } = sqlForPartialUpdate(data, {
			commodityName  : 'commodity_name',
			scientificName : 'scientific_name',
			coolingMethod  : 'cooling_method'
		});

		const querySql = `UPDATE commodities 
                      SET ${setCols} 
                      WHERE id = '${id}' 
                      RETURNING id, commodity_name AS "commodityName", variety, scientific_name AS "scientificName", cooling_method AS "coolingMethod", climacteric`;

		try {
			const result = await db.query(querySql, [
				...values
			]);

			const commodity = result.rows[0];
			return commodity;
		} catch (e) {
			throw new NotFoundError(`No commodity: ${id}`);
		}
	}

	// removes commodity by id

	static async remove(id) {
		const querySql = `DELETE
		FROM commodities
		WHERE id = $1
		RETURNING id`;

		const result = await db.query(querySql, [
			id
		]);
		if (result.rowCount === 0) {
			throw new NotFoundError(`Could not find commodity to delete: ${id}`);
		}
		return result;
	}
}

module.exports = Commodity;
