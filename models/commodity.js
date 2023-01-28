'use strict';

const db = require('../db');
const { NotFoundError } = require('../expressError');
const { sqlForPartialUpdate } = require('../helpers/sql');
const { getCommodityId } = require('../helpers/commodityId');

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
		let commodity = result.rows[0];

		return commodity;
	}

	/** Find all commodities.
   *
   * Returns [{ commodityName, variety, scientificName, coolingMethod, climacteric }, ...]
   **/

	static async findAll() {
		const result = await db.query(
			`SELECT id,commodity_name AS
	            "commodityName", variety,
	            scientific_name AS "scientificName", cooling_method AS "coolingMethod",
	            climacteric
	           FROM commodities
	           ORDER BY commodity_name`
		);

		return result.rows;
	}

	// 	/** Given a commodity id, return data about commodity.
	//    *
	//    * Returns { commodityName, variety, scientificName, coolingMethod, climacteric }
	//    *   where jobs is { id, title, company_handle, company_name, state }
	//    *
	//    * Throws NotFoundError if commodity not found.
	//    **/

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

		// 		if (!commodity) throw new NotFoundError(`No commodity: ${commodityRes}`);

		// 		const ethyleneRes = await db.query(
		// 			`SELECT temperature, c2h4_production, c2h4_class FROM ethylene_sensitivity WHERE commodity_id = $1`,
		// 			[
		// 				id
		// 			]
		// 		);

		// 		commodity.ethyleneSensitivity = ethyleneRes.rows[0];

		// 		const respirationRes = await db.query(
		// 			`SELECT temperature_celsius AS "temperatureCelsius", rr_mg_kg_hr AS "respirationRate", rr_class AS "respirationClass" FROM respiration_rates WHERE commodity_id = $1`,
		// 			[
		// 				id
		// 			]
		// 		);

		// 		commodity.respirationRates = respirationRes.rows[0];

		// 		const referencesRes = await db.query(
		// 			`SELECT source
		//                 FROM references
		// 		       WHERE commodity_id = $1`,
		// 			[
		// 				id
		// 			]
		// 		);

		// 		commodity.references = referencesRes.rows;

		// 		// commodity.references = referencesRes.rows.map((a) => referencesRes);

		return commodity;
	}

	static async update(id, data) {
		const { setCols, values } = sqlForPartialUpdate(data, {
			commodityName  : 'commodity_name',
			scientificName : 'scientific_name',
			coolingMethod  : 'cooling_method'
		});

		const querySql = `UPDATE commodities 
                      SET ${setCols} 
                      WHERE id = ${id} 
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

		// const result = await db.query(querySql, [
		// 	...values
		// ]);
		// const commodity = result.rows[0];

		// if (!commodity) throw new NotFoundError(`No commodity: ${id}`);

		// return commodity;
	}

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
