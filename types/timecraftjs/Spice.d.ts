import { ASM_SPICE_LITE, ASM_SPICE_FULL } from './constants';

//export class CSpice {
//}

export class Spice {

    //module: CSpice | null;
    ready: boolean;
    //whenReady: Promise<void>;
    //onStdOut: (...args) => void;
    //onStdErr: (...args) => void;

    constructor();

    // initialize the module
    init(type: ASM_SPICE_LITE | ASM_SPICE_FULL): Promise<Spice>;

    // Convenience Functions
    // loading kernels
    loadKernel(buffer: ArrayBuffer|Uint8Array, key: string | null): void;

    // unloading kernel
    unloadKernel(key: string): void;

    // Chronos CLI
    // https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/ug/chronos.html
    chronos(inptim: string, cmdlin: string): string;

    // Wrapped spice functions
    /**
     * @func b1900
     * @desc Return the Julian Date corresponding to Besselian Date 1900.0.
     * @returns {number} 2415020.31352
     */
    b1900(): number;

    /**
     * @func b1950
     * @desc Return the Julian Date corresponding to Besselian Date 1950.0.
     * @returns {number} 2433282.42345905
     */
    b1950(): number;

    /**
     * @func bodc2n
     * @desc Translate the SPICE integer code of a body into a common name
     * @param {number} code - The NAIF ID code of then body.
     * @returns {string | undefined} The name of the body if it exists, otherwise undefined.
     */
    bodc2n(code: number): { name: string, found: number };

    /**
     * @func bodc2s
     * @desc Translate a body ID code to either the corresponding name or if no
     name to ID code mapping exists, the string representation of the
     body ID value.
     * @param {number} code - The NAIF ID code of then body.
     * @returns {string} The name of the body if it exists, otherwise the number as a string.
     */
    bodc2s(code: number): string;

    /* boddef:    Define a body name/ID code pair for later translation via
     bodn2c_c or bodc2n_c.
     */
    /**
     * @todo Document and test this!
     */
    boddef(name: string, code: number): void;

    /* bodfnd:    Determine whether values exist for some item for any body
     in the kernel pool.
     */
    /**
     * @todo Document and test this!
     */
    bodfnd(body: number, item: string): void;

    /* bodn2c:    Translate the name of a body or object to the corresponding SPICE
    integer ID code.
    */
    /**
     * @func bodn2c
     * @desc Translate the name of a body or object to the corresponding SPICE integer ID code.
     * @param {name} name - The common name of the body.
     * @returns {number | undefined} The SPICE ID of the body if it exists, otherwise undefined.
     */
    bodn2c(name: string): { code: number, found: number };

    /* bods2c:    Translate a string containing a body name or ID code to an integer
    code.
    */
    /**
     * @func bods2c
     * @desc Translate the name of a body or object to the corresponding SPICE integer ID code.
     * @param {name} name - The common name of a body or its code as a string.
     * @returns {number | undefined} If a body name was passed in, the SPICE ID of the body if it exists, otherwise undefined. If a string number was passed in, the number as an integer.
     */
    bods2c(name: string): { code: number, found: number };

    /* bodvcd:
    Fetch from the kernel pool the double precision values of an item
    associated with a body, where the body is specified by an integer ID
    code.
    */
    /**
     * @todo Document and test this!
     */
    bodvcd(bodyid: number, item: string, maxn: number): number[];

    /* bodvrd:
    Fetch from the kernel pool the double precision values
    of an item associated with a body.
    */
    /**
     * @todo Document and test this!
     */
    bodvrd(body: string, item: string, maxn: number): number[];

    /* convrt:
        Take a measurement X, the units associated with
        X, and units to which X should be converted; return Y ---
        the value of the measurement in the output units.
    */
    /**
     * @func convrt
     * @desc Take a measurement X, the units associated with X, and units to which X should be converted; return the value of the measurement in the output units.
     * @param {number} x - The number in units of in_var to convert.
     * @param {string} in_var - The kind of units x is in. Acceptable units are:

        Angles:                 "RADIANS"
                                "DEGREES"
                                "ARCMINUTES"
                                "ARCSECONDS"
                                "HOURANGLE"
                                "MINUTEANGLE"
                                "SECONDANGLE"

        Metric Distances:       "METERS"
                                "KM"
                                "CM"
                                "MM"

        English Distances:      "FEET"
                                "INCHES"
                                "YARDS"
                                "STATUTE_MILES"
                                "NAUTICAL_MILES"

        Astrometric Distances:  "AU"
                                "PARSECS"
                                "LIGHTSECS"
                                "LIGHTYEARS" julian lightyears

        Time:                   "SECONDS"
                                "MINUTES"
                                "HOURS"
                                "DAYS"
                                "JULIAN_YEARS"
                                "TROPICAL_YEARS"
                                "YEARS" (same as julian years)

        The case of the string in is not significant.
    * @param {string} out - The kind of units for the output to be in. The same kinds of units are valid.
    * @returns {number} The value of x measure in the new units.
    */
    convrt(x: number, in_var: string, out: string): number;

    /**
     * @func deltet
     * @desc Return the value of Delta ET (ET-UTC) for an input epoch.
     * @param {number} epoch - Input epoch (seconds past J2000).
     * @param {string} eptype - Type of input epoch ("UTC" or "ET"). "UTC": epoch is in UTC seconds past J2000 UTC. "ET": epoch is in Ephemeris seconds past J2000 TDB.
     * @returns {number} Delta ET (ET-UTC) at input epoch
     */
    deltet(epoch: number, eptype: string): number;

    /* erract:    Retrieve or set the default error action.
    */
    /**
     * @todo Document and test this!
     */
    erract(op: string, action: string = ''): string;

    errprt(op: string, list: string = ''): string;

    /* et2lst:
    Given an ephemeris epoch, compute the local solar time for
    an object on the surface of a body at a specified longitude.
    */
    /**
     * @func et2lst
     * @summary Given an ephemeris epoch, compute the local true solar time for an object on the surface of a body at a specified longitude.
     * @desc  In the planetographic coordinate system, longitude is defined using
    the spin sense of the body.  Longitude is positive to the west if
    the spin is prograde and positive to the east if the spin is
    retrograde.  The spin sense is given by the sign of the first degree
    term of the time-dependent polynomial for the body's prime meridian
    Euler angle "W":  the spin is retrograde if this term is negative
    and prograde otherwise.  For the sun, planets, most natural
    satellites, and selected asteroids, the polynomial expression for W
    may be found in a SPICE PCK kernel.

    The earth, moon, and sun are exceptions: planetographic longitude
    is measured positive east for these bodies.
    * @param {number} et - The time to convert in Ephemeris seconds past J2000.
    * @param {number} body - The NAIF ID of the body to find the local solar time on.
    * @param {number} lon - The longitude to observe from, measured in radians.
    * @param {string} type - "PLANETOCENTRIC" or "PLANETOGRAPHIC".
    * @returns {object} An object with the following valued: hr - the number of hours (24 hours lock), mn - the number of minutes, sc - the number of seconds, time - the local true solar time string in a 24 hour clock, and ampm - then local true solar time string in a 12 hour clock.
    */
    et2lst(et: number, body: number, lon: number, type: string): { hr: number, mn: number, sc: number, time: string, ampm: string };

    /**
     * @func et2utc
     * @desc Convert an input time from ephemeris seconds past J2000 to Calendar, Day-of-Year, or Julian Date format, UTC.
     * @param {number} et - Input epoch, given in ephemeris seconds past J2000.
     * @param {string} format - Format of output epoch. May be any of the following:
     *
     *        "C" - Calendar format, UTC.
     *
     *        "D" - Day-of-Year format, UTC.
     *
     *        "J" - Julian Date format, UTC.
     *
     *        "ISOC" - ISO Calendar format, UTC.
     *
     *        "ISOD" - ISO Day-of-Year format, UTC.
     * @param {number} prec - Digits of precision in fractional seconds or days. Must be between 0 and 14, inclusive. Determines to how many decimal places the UTC time will be calculated.
     * @returns {string} The corresponding time in UTC.
     */
    et2utc(et: number, format: string, prec: number): string;

    /* etcal:    Convert from an ephemeris epoch measured in seconds past
    the epoch of J2000 to a calendar string format using a
    formal calendar free of leapseconds.
    */
    /**
     * @func etcal
     * @desc Convert from an ephemeris epoch measured in seconds past the epoch of J2000 to a calendar string format using a formal calendar free of leapseconds.
     * @param {number} et - An ephemeris epoch in seconds past J2000
     * @ returns {string} The corresponding time in calendar format (Year Month Day Time)
     */
    etcal(et: number): string;

    /* failed: True if an error condition has been signaled via sigerr_c.
    failed_c is the CSPICE status indicator
    */
    /**
     * @todo Document and test this!
     */
    failed(): number;

    // Provide SPICE one or more kernels to load
    /**
     * @func furnsh(kernelPaths)/furnish
     * @desc Load one or more SPICE kernels into a program. Files must exists in the memory system or an error will occur.
     * @param {string | array} kernelPaths - Path or array of paths to kernel files.
     */
    furnsh(kernelPath: string): void;

    unload(kernelPath: string): void;

    /* getmsg:
    Retrieve the current short error message,
    the explanation of the short error message, or the
    long error message.
    */
    getmsg(option: string): string;

    /* j1900:    Return the Julian Date of 1899 DEC 31 12:00:00 (1900 JAN 0.5).
    */
    /**
     * @func j1900
     * @desc Return the Julian Date of 1899 DEC 31 12:00:00 (1900 JAN 0.5).
     * @returns {number} 2415020.0
     */
    j1900(): number;

    /* j1950:    Return the Julian Date of 1950 JAN 01 00:00:00 (1950 JAN 1.0).
    */
    /**
     * @func j1950
     * @desc Return the Julian Date of 1950 JAN 01 00:00:00 (1950 JAN 1.0).
     * @returns {number} 2433282.5
     */
    j1950(): number;

    /* j2000:    Return the Julian Date of 2000 JAN 01 12:00:00 (2000 JAN 1.5).
    */
    /**
     * @func j2000
     * @desc Return the Julian Date of 2000 JAN 01 12:00:00 (2000 JAN 1.5).
     * @returns {number} 2451545.0
     */
    j2000(): number;

    /* j2100:    Return the Julian Date of 2100 JAN 01 12:00:00 (2100 JAN 1.5).
    */
    /**
     * @func j2100
     * @desc Return the Julian Date of 2100 JAN 01 12:00:00 (2100 JAN 1.5).
     * @returns {number} 2488070.0
     */
    j2100(): number;

    /* jyear:    Return the number of seconds in a julian year.
     */
    /**
     * @func jyear
     * @desc Return the number of seconds in a julian year.
     * @returns {number} 31557600
     */
    jyear(): number;

    /* ltime:
    This routine computes the transmit (or receive) time
    of a signal at a specified target, given the receive
    (or transmit) time at a specified observer. The elapsed
    time between transmit and receive is also returned.
    */
    /**
     * @todo Document and test this!
     */
    ltime(etobs: number, obs: number, dir: string, targ: number): { ettarg: number, elapsd: number };

    /* reset:
    Reset the CSPICE error status to a value of "no error."
    As a result, the status routine, failed_c, will return a value
    of SPICEFALSE
    */
    /**
     * @todo Document and test this!
     */
    reset(): void;

    /* scdecd:
    Convert double precision encoding of spacecraft clock time into
    a character representation.
    */
    /**
     * @func scdecd
     * @desc Spacecraft - decode: Convert double precision encoding of spacecraft clock time into a character representation.
     * @param {number} sc - NAIF ID of the spacecraft.
     * @param {number} sclkdp - SCLK time to convert in ticks.
     * @returns {string} The character encoding of time sclkdp for spacecraft sc.
     */
    scdecd(sc: number, sclkdp: number): string;

    /* sce2c:
    Convert ephemeris seconds past J2000 (ET) to continuous encoded
    spacecraft clock (`ticks').  Non-integral tick values may be
    returned.
    */
    /**
     * @func sce2c
     * @desc Spacecraft - ephemeris to clock: Convert ephemeris seconds past J2000 (ET) to continuous encoded spacecraft clock (`ticks').  Non-integral tick values may be returned.
     * @param {number} sc - NAIF ID of the spacecraft.
     * @param {number} et - Ephemeris seconds past J2000
     * @returns {number} The corresponding SCLK time for spacecraft sc in clock ticks.
     */
    sce2c(sc: number, et: number): number;

    /* sce2s:
    Convert an epoch specified as ephemeris seconds past J2000 (ET) to a
    character string representation of a spacecraft clock value (SCLK).
    */
    /**
     * @func sce2s
     * @desc Spacecraft - ephemeris to clock string: Convert an epoch specified as ephemeris seconds past J2000 (ET) to a character string representation of a spacecraft clock value (SCLK).
     * @param {number} sc - NAIF ID of the spacecraft.
     * @param {number} et - Ephemeris seconds past J2000
     * @returns {string} The corresponding SCLK time for spacecraft sc in SLCK string encoding.
     */
    sce2s(sc: number, et: number): string;

    /* sce2t:
    Convert ephemeris seconds past J2000 (ET) to integral
    encoded spacecraft clock (`ticks'). For conversion to
    fractional ticks, (required for C-kernel production), see
    the routine sce2c_c.
    */
    /**
     * @func sce2t
     * @desc Spacecraft - ephemeris to ticks: Convert ephemeris seconds past J2000 (ET) to integral encoded spacecraft clock (`ticks'). For conversion to fractional ticks, (required for C-kernel production), see the routine sce2c.
     * @param {number} sc - NAIF ID of the spacecraft.
     * @param {number} et - Ephemeris seconds past J2000
     * @returns {number} The corresponding SCLK time for spacecraft sc in clock ticks to the closest integer.
     */
    sce2t(sc: number, et: number): number;

    /* scencd:
    Encode character representation of spacecraft clock time into a
    double precision number.
    */
    /**
     * @func scencd
     * @desc Spacecraft - encode: Encode character representation of spacecraft clock time into a double precision number.
     * @param {number} sc - NAIF ID of the spacecraft.
     * @param {number} sclkch - SCLK time in character encoding.
     * @returns {number} Sclkch in spacecraft ticks.
     */
    scencd(sc: number, sclkch: number): number;

    /* scfmt:
    Convert encoded spacecraft clock ticks to character clock format.
    */
    /**
     * @func scfmt
     * @desc Spacecraft - format: Convert encoded spacecraft clock ticks to character clock format.
     * @param {number} sc - NAIF ID of the spacecraft.
     * @param {number} ticks - SCLK time (in ticks) to convert.
     * @returns {string} A string encoding of time ticks for spacecraft sc. Note the important difference between scfmt and scdecd. scdecd converts some number of ticks since the spacecraft clock start
     * time to a character string which includes a partition number. scfmt, which is called by scdecd, does not make use of partition information.
     */
    scfmt(sc: number, ticks: number): string;

    /* scpart:
    Get spacecraft clock partition information from a spacecraft
    clock kernel file.
    */
    /**
     * @func scpart
     * @desc Get spacecraft clock partition information from a spacecraft clock kernel file.
     * @param {number} sc - NAIF ID of the spacecraft.
     * @returns {object} An object containing two arrays: pstart and pstop. pstart contains the list of partition start times for spacecraft sc and pstop contains the partition stop times.
     */
    scpart(sc: number): { pstart: number[], pstop: number[] };

    /* scs2e:
    Convert a spacecraft clock string to ephemeris seconds past
    J2000 (ET).
    */
    /**
     * @func scs2e
     * @desc Spacecraft - string to ephemeris. Convert a spacecraft clock string to ephemeris seconds past J2000 (ET).
     * @param {number} sc - NAIF ID of the spacecraft.
     * @param {string} sclkch - String encoded SCLK time
     * @returns {number} The corresponding time in ET seconds past J2000
     */
    scs2e(sc: number, sclkch: string): number;

    /* sct2e:
    Convert encoded spacecraft clock (`ticks') to ephemeris
    seconds past J2000 (ET).
    */
    /**
     * @func sct2e
     * @desc Spacecraft - ticks to ephemeris. Convert encoded spacecraft clock (`ticks') to ephemeris seconds past J2000 (ET).
     * @param {number} sc - NAIF ID of the spacecraft.
     * @param {number} sclkdp - SCLK time in ticks
     * @returns {number} The corresponding time in ET seconds past J2000
     */
    sct2e(sc: number, sclkdp: number): number;

    /* sctiks:
    Convert a spacecraft clock format string to number of "ticks".
    */
    /**
     * @func sctiks
     * @desc Spacecraft - ticks: Convert character representation of spacecraft clock time into a double precision number of ticks.
     * @param {number} sc - NAIF ID of the spacecraft.
     * @param {number} clkstr - SCLK time in character encoding.
     * @returns {number} Corresponding time in SCLK ticks. Note the important difference between scencd and sctiks. scencd converts a clock string to the number of ticks it represents
     * since the beginning of the mission, and so uses partition information. sctiks_c just converts to absolute ticks.
     */
    sctiks(sc: number, clkstr: number): number;

    /* spd:    Return the number of seconds in a day.
    */
    /**
     * @func spd
     * @desc Return the number of seconds in a day.
     * @returns {number} 86400
     */
    spd(): number;

    /* str2et:    Convert a string representing an epoch to a double precision
    value representing the number of TDB seconds past the J2000
    epoch corresponding to the input epoch.
    */
    /**
     * @func str2et
     * @desc Convert a string representing an epoch in UTC to a double precision value representing the number of TDB seconds past the J2000 epoch corresponding to the input epoch.
     * @param {string} str - A UTC epoch in calendar format
     * @returns {number} The corresponding time in ET seconds past J2000.
     */
    str2et(str: string): number;

    /* timdef:
    Set and retrieve the defaults associated with calendar
    input strings.
    */
    /**
     * @todo Document and test this!
     */
    timdef(action: string, item: string, value: number): string;

    /* timout:
    This routine converts an input epoch represented in TDB seconds
    past the TDB epoch of J2000 to a character string formatted to
    the specifications of a user's format picture.
    */
    /**
     * @func timout
     * @desc This routine converts an input epoch represented in TDB seconds past the TDB epoch of J2000 to a character string formatted to the specifications of a user's format picture.
     * @param {number} et - Time in ET seconds past J2000.
     * @param {string} pictur - The format describing how the time should returned. For example, "Mon DD, YYYY AP:MN:SC AMPM" might result in "Nov 19, 2014 06:12:08 P.M.".
     * @returns {string} The time formatted to fit to pictur.
     */
    timout(et: number, pictur: string): string;

    /* tparse:
    Parse a time string and return seconds past the J2000 epoch
    on a formal calendar.
    */
    /**
     * @todo Document and test this!
     */
    tparse(string: string): { sp2000: number, errmsg: string };

    /* tpictr:
    Given a sample time string, create a time format picture
    suitable for use by the routine timout_c.
    */
    /**
     * @func tpictr
     * @desc Given a sample time string, create a time format picture suitable for use by the routine timout.
     * @param {string} sample - A time string that conforms to the desired format. For example, "Oct 24, 1994 23:45:12 PM" becomes "Mon DD, YYYY AP:MN:SC AMPM".
     * @returns {string} A correctly formatted picture to be passed into timout for time conversion.
     */
    tpictr(sample: string): { picture: string, ok: number, errmsg: string };

    /* tsetyr:   Set the lower bound on the 100 year range
    */
    /**
     * @todo Document and test this!
     */
    tsetyr(year: number): void;

    /* tyear:
    Return the number of seconds in a tropical year.
    */
    /**
     * @func tyear
     * @desc Return the number of seconds in a tropical year.
     * @returns {number} 31556925.9747
     */
    tyear(): number;

    /* unitim:    Transform time from one uniform scale to another.  The uniform
    time scales are TAI, TDT, TDB, ET, JED, JDTDB, JDTDT.
    */
    /**
     * @fund unitim
     * @desc Transform time from one uniform scale to another. The uniform time scales are TAI, TDT, TDB, ET, JED, JDTDB, JDTDT.
     * @param {number} epoch - The epoch to convert from
     * @param {string} insys - The time system the input epoch is in ("TAI", "TDT", "TDB", "ET", "JED", "JDTDB", or "JDTDT").
     * @param {string} outsys - The time system the output should be in ("TAI", "TDT", "TDB", "ET", "JED", "JDTDB", or "JDTDT").
     * @returns {number} The corresponding time in the outsys scale.
     */
    unitim(epoch: number, insys: string, outsys: string): number;

    /* utc2et:    Convert an input time from Calendar or Julian Date format, UTC,
    to ephemeris seconds past J2000.
    */
    /**
     * @func utc2et
     * @desc Convert an input time from Calendar or Julian Date format, UTC, to ephemeris seconds past J2000.
     * @param {string} utcstr - A UTC time in calendar or Julian date format
     * @returns {number} The corresponding time in ET seconds past J2000.
     */
    utc2et(utcstr: string): number;

    spkpos(targ: string, et: number, ref: string, abcorr: string, obs: string): { ptarg: [number, number, number], lt: number };

}
