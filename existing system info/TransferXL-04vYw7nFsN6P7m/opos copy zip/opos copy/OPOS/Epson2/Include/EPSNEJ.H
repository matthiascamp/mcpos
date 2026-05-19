/////////////////////////////////////////////////////////////////////
//
// EPSNEJ.H
//
//    header file for OPOS Applications.
//
// Modification history
// ------------------------------------------------------------------
// new
//
/////////////////////////////////////////////////////////////////////

#if !defined(EPSNEJ_H)
#define      EPSNEJ_H

/////////////////////////////////////////////////////////////////////
// DirectIO Command
const long	EJ_DI_RECOVER_ERROR	= 0;

/////////////////////////////////////////////////////////////////////
// ResultCodeExtennded
const LONG OPOS_EEJ_EJ_PRINTING			= EJERREXT + 1;
const LONG OPOS_EEJ_PTR_PRINTING		= EJERREXT + 2;
const LONG OPOS_EEJ_MEDIUM_USED			= EJERREXT + 3;
const LONG OPOS_EEJ_MARKERORDER			= EJERREXT + 4;
const LONG OPOS_EEJ_BADFILE				= EJERREXT + 5;

#endif                  // !defined(EPSNEJ_H)

