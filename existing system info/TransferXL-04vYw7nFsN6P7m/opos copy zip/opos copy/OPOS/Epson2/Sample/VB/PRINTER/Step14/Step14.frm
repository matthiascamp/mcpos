VERSION 5.00
Object = "{CCB90150-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSPOSPrinter.ocx"
Begin VB.Form Step14 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 14 TM-L90 with Peeler sample program."
   ClientHeight    =   6165
   ClientLeft      =   45
   ClientTop       =   330
   ClientWidth     =   5655
   LinkTopic       =   "Form8"
   MaxButton       =   0   'False
   ScaleHeight     =   6165
   ScaleWidth      =   5655
   Begin VB.Frame Frame5 
      Caption         =   "Device Statistics"
      Height          =   1560
      Left            =   1140
      TabIndex        =   6
      Top             =   3840
      Width           =   3375
      Begin VB.TextBox txtRetrieveSt 
         Height          =   285
         Left            =   260
         TabIndex        =   7
         Top             =   600
         Width           =   2775
      End
      Begin VB.CommandButton cmdRetrieveSt 
         Caption         =   "Retrieve Statistics"
         Height          =   435
         Left            =   260
         TabIndex        =   8
         Top             =   960
         Width           =   2775
      End
      Begin VB.Label Label6 
         Caption         =   "RetrieveStatistics parameter"
         Height          =   255
         Left            =   260
         TabIndex        =   10
         Top             =   300
         Width           =   2775
      End
   End
   Begin VB.CommandButton cmdExit 
      Cancel          =   -1  'True
      Caption         =   "Close"
      Height          =   330
      Left            =   3210
      TabIndex        =   9
      Top             =   5640
      Width           =   1065
   End
   Begin VB.Frame Frame2 
      Caption         =   "Slip"
      Enabled         =   0   'False
      Height          =   1050
      Left            =   1140
      TabIndex        =   4
      Top             =   2640
      Width           =   3375
      Begin VB.CommandButton cmdPrintSales 
         Caption         =   "Print Sales Slip"
         Enabled         =   0   'False
         Height          =   435
         Left            =   315
         TabIndex        =   5
         Top             =   360
         Width           =   2775
      End
   End
   Begin VB.Frame Frame1 
      Caption         =   "Receipt"
      Height          =   2220
      Left            =   1140
      TabIndex        =   0
      Top             =   240
      Width           =   3375
      Begin VB.CommandButton cmdPrint 
         Caption         =   "Print"
         Height          =   435
         Left            =   315
         TabIndex        =   1
         Top             =   420
         Width           =   2775
      End
      Begin VB.CommandButton cmdAsync 
         Caption         =   "Asynchronous printing"
         Height          =   435
         Left            =   315
         TabIndex        =   2
         Top             =   945
         Width           =   2775
      End
      Begin VB.CommandButton cmdReceipt 
         Caption         =   "Print Receipt"
         Height          =   435
         Left            =   315
         TabIndex        =   3
         Top             =   1470
         Width           =   2775
      End
   End
   Begin OposPOSPrinter_CCOCtl.OPOSPOSPrinter OPOSPOSPrinter1 
      Left            =   2040
      OleObjectBlob   =   "Step14.frx":0000
      Top             =   5520
   End
End
Attribute VB_Name = "Step14"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
' Step 14  Device Statistics.

Option Explicit

Private Declare Sub Sleep Lib "kernel32" (ByVal sec As Long)

Private Type ITEMDATA
    Name As String
    Price As Long
End Type


Function GetErrorMsg() As String

    Dim BF As String

'Make messages on each event information
    Select Case OPOSPOSPrinter1.ResultCodeExtended
    Case OPOS_EPTR_COVER_OPEN
        BF = "Printer cover is open."
    Case OPOS_EPTR_JRN_EMPTY
        BF = "No jurnal paper."
    Case OPOS_EPTR_REC_EMPTY
        BF = "No receipt paper."
    Case OPOS_EPTR_SLP_EMPTY
        BF = "No slip form."
    Case Else
        BF = "ResultCode = " + CStr(OPOSPOSPrinter1.ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(OPOSPOSPrinter1.ResultCodeExtended)
    End Select

    GetErrorMsg = BF

End Function


Private Function SlpInsertion() As Boolean

    Dim MSG     As Long
    Dim SlpPrintable    As Long
    Dim pMSG    As String
    Dim bEndInsert  As Boolean
    
    'Insert sheet
    SlpPrintable = 1
    bEndInsert = False
    
    With OPOSPOSPrinter1
        While SlpPrintable
            .BeginInsertion 500
            'Check a sheet/Error check
            If (.ResultCode <> OPOS_SUCCESS) Then
                Select Case .ResultCode
                Case OPOS_E_TIMEOUT
                    pMSG = "Insert slip."
                
                Case OPOS_E_ILLEGAL
                    If (.SlpEmpty = True) Then
                        pMSG = "Remove slip."
                        bEndInsert = True
                        .EndInsertion
                    Else
                        pMSG = GetErrorMsg()
                        .BeginRemoval -1
                    End If
                
                Case Else
                    pMSG = GetErrorMsg()
                End Select
                
                MSG = MsgBox(pMSG, vbRetryCancel, "Print credit sales slip ")
                If bEndInsert = True Then
                    .EndInsertion
                    bEndInsert = False
                End If
                ' Cancel
                If (MSG = vbCancel) Then
                    .EndInsertion
                    .BeginRemoval (-1)
                    .EndRemoval
                    SlpInsertion = False
                    Exit Function
                End If
            Else
                .EndInsertion
                pMSG = ""
                Select Case .ResultCode
                Case OPOS_E_EXTENDED
                    If .ResultCodeExtended = OPOS_EPTR_SLP_EMPTY Then
                        pMSG = "Insert slip."
                    End If
                
                Case OPOS_SUCCESS
                    'Slip is removed.
                    If .SlpNearEnd = True Then
                        .BeginRemoval -1
                        pMSG = "Insert slip."
                    'Cover is open.
                    ElseIf .CoverOpen = True Then
                        pMSG = "Close the cover"
                    Else
                        SlpPrintable = 0
                    End If
                    
                Case OPOS_E_ILLEGAL
                    If .CoverOpen = True And .SlpEmpty = True Then
                        pMSG = "Insert slip"
                        SlpPrintable = 0
                    Else
                        pMSG = "Insert slip"
                        .Close
                        .Open ("Unit1")
                        .ClaimDevice -1
                        .DeviceEnabled = True
                    End If
                End Select
                        
                If pMSG <> "" Then
                    MSG = MsgBox(pMSG, vbRetryCancel, "Print credit sales slip ")
                    If (MSG = vbCancel) Then
                        .EndInsertion
                        .BeginRemoval (-1)
                        .EndRemoval
                        SlpInsertion = False
                        Exit Function
                    End If
                End If
            End If
        Wend
    End With

    SlpInsertion = True

End Function


Private Function SlpRemoval() As Boolean

    Dim pMSG    As String
    Dim MSG     As Long
    Dim RecPrintable As Long
    
    RecPrintable = 1
    With OPOSPOSPrinter1
        While RecPrintable
            .BeginRemoval 5000
            If (.ResultCode <> OPOS_E_TIMEOUT) Then
                RecPrintable = 0
            Else
                MSG = MsgBox("Remove slip", vbOKOnly + vbExclamation, "Print credit sales slip")
            End If
        Wend
        If (.ResultCode <> OPOS_E_ILLEGAL) Then
            RecPrintable = 1
            While RecPrintable
                .EndRemoval
                If (.ResultCode = OPOS_SUCCESS) Then
                    RecPrintable = 0
                Else
                    pMSG = GetErrorMsg()
                    
                    MSG = MsgBox(pMSG, vbRetryCancel + vbQuestion, "Print credit sales slip")
                    'Canceled
                    If (MSG = vbCancel) Then
                        SlpRemoval = False
                        Exit Function
                    End If
                End If
            Wend
        Else
            .EndRemoval
        End If
    End With

    SlpRemoval = True

End Function

Private Function MakePrintString(lRecLineChars As Long, sBuf As String, sPrice As String)
    Dim sValue As String
    If lRecLineChars < (Len(sBuf) + Len(sPrice)) Then
        sValue = sBuf + sPrice
    Else
        sValue = sBuf + Space(lRecLineChars - (Len(sBuf) + Len(sPrice))) + sPrice
    End If
    
    MakePrintString = sValue
End Function

Private Sub cmdPrint_Click()

    Dim bExit As Boolean
    Dim lValue As Long
    Dim ESC As String * 1
    Dim BcData  As String

    If OPOSPOSPrinter1.CapRecPresent = False Then
        MsgBox "This Printer doesn't have Receipt Station.", vbExclamation
        Exit Sub
    End If

' Initialization
    MousePointer = vbHourglass
    ESC = Chr(&H1B)
    BcData = "4902720005074"
    bExit = False

    With OPOSPOSPrinter1
        .TransactionPrint PTR_S_RECEIPT, PTR_TP_TRANSACTION
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Cannot use a POS Printer.", vbExclamation
            MousePointer = vbDefault
            Exit Sub
        End If

        'Loop
        Do
            'Whether a bitmap can be used, or not.
            .PrintNormal PTR_S_RECEIPT, ESC + "|4C" + "apple    $1.00" + vbLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|200uF"
            .PrintNormal PTR_S_RECEIPT, ESC + "|N" + ESC + "|bC" + ESC + "|cA" + "Best if used by Dec. 24, 2004" + vbLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|200uF"
            If .CapRecBarCode = True Then
                .PrintBarCode PTR_S_RECEIPT, BcData, PTR_BCS_EAN13, 500, .RecLineWidth / 3, PTR_BC_RIGHT, PTR_BC_TEXT_BELOW
            End If
            
            'Feed the PTR_MF_TO_NEXT_TOF position.
            If (.CapRecMarkFeed And PTR_MF_TO_TAKEUP) Then
                .MarkFeed (PTR_MF_TO_TAKEUP)
            ElseIf (.CapRecMarkFeed And PTR_MF_TO_NEXT_TOF) Then
                .MarkFeed (PTR_MF_TO_NEXT_TOF)
            End If
            
            If .ResultCode = OPOS_SUCCESS Then Exit Do
            
            'When error occurs, display a message to ask the user whether retry or not.
            Select Case MsgBox("Fails to output to a printer." + vbCrLf + vbCrLf + "Retry?", vbAbortRetryIgnore + vbQuestion)
            Case vbAbort                   ' "Cancel"has been selected
                .ClearOutput
                bExit = True
                Exit Do
            Case vbRetry                   ' "Retry"has been selected.
                .ClearOutput
            Case vbIgnore                  ' "Ignore" has been selected.
                Exit Do
            End Select
        Loop
        
        If bExit = False Then               'Has it been canceled?
            ' Wait until device is 'OPOS_S_IDLE'
            While .State <> OPOS_S_IDLE
                
            Wend
            .TransactionPrint PTR_S_RECEIPT, PTR_TP_NORMAL
            If .ResultCode <> OPOS_SUCCESS Then
                MsgBox "Cannot use a POS Printer.", vbExclamation
                ' Clear the buffered data since the buffer retains print data
                ' when an error occurs during printing.
                .ClearOutput
                MousePointer = vbDefault
                Exit Sub
            End If
        End If
    End With

    MousePointer = vbDefault

End Sub

Private Sub cmdAsync_Click()

    Dim bExit As Boolean
    Dim ESC As String * 1
    Dim BcData  As String

    If OPOSPOSPrinter1.CapRecPresent = False Then
        MsgBox "This Printer doesn't have Receipt Station.", vbExclamation
        Exit Sub
    End If

' Initialization
    MousePointer = vbHourglass
    ESC = Chr(&H1B)
    BcData = "4902720005074"
    bExit = False

    With OPOSPOSPrinter1
        .AsyncMode = True
        .TransactionPrint PTR_S_RECEIPT, PTR_TP_TRANSACTION
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Cannot use a POS Printer.", vbExclamation
            .AsyncMode = False
            MousePointer = vbDefault
            Exit Sub
        End If
        
        'Loop
        Do
            'Whether a bitmap can be used, or not.
            .PrintNormal PTR_S_RECEIPT, ESC + "|4C" + "apple    $1.00" + vbLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|200uF"
            .PrintNormal PTR_S_RECEIPT, ESC + "|N" + ESC + "|bC" + ESC + "|cA" + "Best if used by Dec. 24, 2004" + vbLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|200uF"
            If .CapRecBarCode = True Then
                .PrintBarCode PTR_S_RECEIPT, BcData, PTR_BCS_EAN13, 500, .RecLineWidth / 3, PTR_BC_RIGHT, PTR_BC_TEXT_BELOW
            End If
            
            'Feed the PTR_MF_TO_NEXT_TOF position.
            If (.CapRecMarkFeed And PTR_MF_TO_TAKEUP) Then
                .MarkFeed (PTR_MF_TO_TAKEUP)
            ElseIf (.CapRecMarkFeed And PTR_MF_TO_NEXT_TOF) Then
                .MarkFeed (PTR_MF_TO_NEXT_TOF)
            End If
            
            If .ResultCode = OPOS_SUCCESS Then Exit Do
            
        'When error occurs, display a message to ask the user whether retry or not.
            Select Case MsgBox("Fails to output to a printer" + vbCrLf + vbCrLf + "Retry?", vbAbortRetryIgnore + vbQuestion)
            Case vbAbort                    ' "Cancel"has been selected
                .ClearOutput
                bExit = True
                Exit Do
            Case vbRetry                    ' "Retry" has been selected
                .ClearOutput
            Case vbIgnore                   ' "Ignore" has been selected
                Exit Do
            End Select
        Loop

        If bExit = False Then               'Has it been canceled?
            .TransactionPrint PTR_S_RECEIPT, PTR_TP_NORMAL
            If .ResultCode <> OPOS_SUCCESS Then
                MsgBox "Cannot use a POS Printer.", vbExclamation
                .AsyncMode = False
                ' Clear the buffered data since the buffer retains print data
                ' when an error occurs during printing.
                .ClearOutput
                MousePointer = vbDefault
                Exit Sub
            End If
        End If
        .AsyncMode = False
    End With

    MousePointer = vbDefault

End Sub

Private Sub cmdReceipt_Click()

    Dim bExit As Boolean
    Dim rcSpacing As Long
    Dim rcHeight As Long
    Dim ESC As String * 1
    Dim RotateType As Long
    Dim bBitmapPrint As Boolean
    Dim bBarcodePrint As Boolean
    Dim BcData  As String
    
    If OPOSPOSPrinter1.CapRecPresent = False Then
        MsgBox "This Printer doesn't have Receipt Station.", vbExclamation
        Exit Sub
    End If

'Check Rotate Function
    If OPOSPOSPrinter1.CapRecLeft90 = False Then
        MsgBox "This printer does not have a rotation printing function.", vbExclamation
        Exit Sub
    End If

    RotateType = 0
    bBitmapPrint = False
    bBarcodePrint = False
    With OPOSPOSPrinter1
        If .CapRecBitmap = True Then
            If InStr(.RecBitmapRotationList, "L90") <> 0 Then
                RotateType = RotateType + PTR_RP_BITMAP
                bBitmapPrint = True
            End If
        End If
        If .CapRecBarCode = True Then
            If InStr(.RecBarCodeRotationList, "L90") <> 0 Then
                RotateType = RotateType + PTR_RP_BARCODE
                bBarcodePrint = True
            End If
        End If
    End With


' Initialization
    ESC = Chr(&H1B)
    bExit = False
    BcData = "49027200"

    With OPOSPOSPrinter1
        'Batch processing mode
        .TransactionPrint PTR_S_RECEIPT, PTR_TP_TRANSACTION
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Cannot use a POS Printer.", vbExclamation
            Exit Sub
        End If
        
        'Rotate 90
        .RotatePrint PTR_S_RECEIPT, PTR_RP_LEFT90 + RotateType

        'Loop
        Do
            rcSpacing = .RecLineSpacing               'Keep the default line spacing
            rcHeight = .RecLineHeight                 'Keep the default line height
            
            If .CapRecBitmap = True Then
                .PrintNormal PTR_S_RECEIPT, ESC + "|1B"
            End If
            'Printing process
            .PrintNormal PTR_S_RECEIPT, ESC + "|4C" + ESC + "|bC" + "apple" + vbCrLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|2uC" + ESC + "|4C" + "$1.00" + vbCrLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|600uF"
            .PrintNormal PTR_S_RECEIPT, ESC + "|N" + "Best if used " + vbLf
            .PrintNormal PTR_S_RECEIPT, "by" + vbLf
            .PrintNormal PTR_S_RECEIPT, "Dec. 24, 2004" + vbLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|600uF"
            If .CapRecBarCode = True Then
                .PrintBarCode PTR_S_RECEIPT, BcData, PTR_BCS_EAN8, 500, .RecLineWidth / 3, PTR_BC_RIGHT, PTR_BC_TEXT_BELOW
            End If

            'When outputting normally,breakout of the loop.
            If .ResultCode = OPOS_SUCCESS Then Exit Do
            'When error occurs, display a message to ask the user whether retry or not.
            Select Case MsgBox("Fails to output to a printer." + vbCrLf + vbCrLf + "Retry?", vbAbortRetryIgnore + vbQuestion)
            Case vbAbort                    ' "Cancel"has been selected
                'Clear all the buffer, and exit.
                .ClearOutput
                bExit = True
                Exit Do
            Case vbRetry                    ' "Retry"has been selected.
                'Clear all the buffer data, and retry.
                .ClearOutput
            Case vbIgnore                   '"Ignore" has been selected.
                Exit Do
            End Select
        Loop

        .RotatePrint PTR_S_RECEIPT, PTR_RP_NORMAL

        If bExit = False Then
            If (.ResultCode = OPOS_SUCCESS) Then
                'Feed the PTR_MF_TO_NEXT_TOF position.
                If (.CapRecMarkFeed And PTR_MF_TO_TAKEUP) Then
                    .MarkFeed (PTR_MF_TO_TAKEUP)
                ElseIf (.CapRecMarkFeed And PTR_MF_TO_NEXT_TOF) Then
                    .MarkFeed (PTR_MF_TO_NEXT_TOF)
                End If
            Else
                MsgBox "Cannot use a POS Printer" + vbCrLf + "ResultCode = " + CStr(.ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(.ResultCodeExtended), 0, "Print Receipt"
                .ClearOutput
            End If
        End If

        ' Wait until device is 'OPOS_S_IDLE'
        While .State <> OPOS_S_IDLE
        Wend
        'Print all the buffer data, and exit the batch processing mode.
        .TransactionPrint PTR_S_RECEIPT, PTR_TP_NORMAL
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Cannot use a POS Printer.", vbExclamation
            .RecLineSpacing = rcSpacing
            .RecLineHeight = rcHeight
            ' Clear the buffered data since the buffer retains print data
            ' when an error occurs during printing.
            .ClearOutput
            Exit Sub
        End If

        .RecLineSpacing = rcSpacing
        .RecLineHeight = rcHeight
    End With

End Sub

Private Sub cmdPrintSales_Click()

    Dim RecNo   As Long
    Dim ESC As String * 1
    Dim fDate   As String
    Dim fTime   As String
    Dim fRecNo  As String
    Dim fName   As String
    Dim fSpace  As String
    Dim OutputData As String

'Request for inserting a slip
    If SlpInsertion() = False Then
        Exit Sub
    End If

' Initialization
    MousePointer = vbHourglass
    ESC = Chr(&H1B)
    fDate = Format(Date, "mmmm dd, yyyy")       'System date
    fTime = Format(Time, "h:mm")                'System time
    RecNo = 1                                   'Register No.
    fRecNo = Format(RecNo, "  0000")
    fName = "ABCDEF"                            'Casher No.
    If OPOSPOSPrinter1.SlpLineChars > 33 Then
        fSpace = Space(OPOSPOSPrinter1.SlpLineChars - 33)    'Left space
    Else
        fSpace = ""
    End If
    
    ' Print data
    OutputData = vbCrLf + fSpace + "Print credit card sales slip" + vbCrLf
    OutputData = OutputData + ESC + "|1lF"
    OutputData = OutputData + fSpace + "        SEIKO EPSON Corp." + vbCrLf
    OutputData = OutputData + fSpace + "Thank you for coming to our shop!" + vbCrLf
    OutputData = OutputData + ESC + "|1lF"
    OutputData = OutputData + fSpace + "Date " + fDate + vbCrLf
    OutputData = OutputData + fSpace + "Time      " + fTime + "Casher   " + fName + vbCrLf
    OutputData = OutputData + fSpace + "Number of the register" + fRecNo + vbCrLf
    OutputData = OutputData + ESC + "|N" + ESC + "|1lF"
    OutputData = OutputData + fSpace + "Details                      cost" + vbCrLf
    OutputData = OutputData + fSpace + "Cardigan                 $ 100.00" + vbCrLf
    OutputData = OutputData + fSpace + "Shoes                     $ 70.00" + vbCrLf
    OutputData = OutputData + fSpace + "Hat                       $ 30.00" + vbCrLf
    OutputData = OutputData + fSpace + "Bag                      $ 150.00" + vbCrLf
    OutputData = OutputData + fSpace + "        Excluded tax     $ 350.00" + vbCrLf
    OutputData = OutputData + fSpace + "        Tax(5%)           $ 17.50" + vbCrLf
    OutputData = OutputData + fSpace + "        -------------------------" + vbCrLf
    OutputData = OutputData + fSpace + ESC + "|2C     Total" + ESC + "|1C     $ 367.50" + vbCrLf
    OutputData = OutputData + ESC + "|1lF"
    OutputData = OutputData + fSpace + "Company name   EPSON-CARD" + vbCrLf
    OutputData = OutputData + fSpace + "Membership No. XXXXXXXXXXXXXXXX" + vbCrLf
    OutputData = OutputData + fSpace + "Valid date     12/05" + vbCrLf
    OutputData = OutputData + fSpace + "Handling No.   9999 - 999999" + vbCrLf
    OutputData = OutputData + fSpace + "Approval No.   99" + vbCrLf
    OutputData = OutputData + ESC + "|1lF"
    OutputData = OutputData + fSpace + "Signature" + vbCrLf
    ' Printing process
    OPOSPOSPrinter1.PrintNormal PTR_S_SLIP, OutputData
    If OPOSPOSPrinter1.ResultCode <> OPOS_SUCCESS Then
        MsgBox "Cannot use a POS Printer.", vbExclamation
        MousePointer = vbDefault
        Exit Sub
    End If

' Clean up
    MousePointer = vbDefault

    'Remove the slip at the slip station.
    If SlpRemoval() = False Then
        'Fail
    End If

End Sub

Private Sub cmdExit_Click()

    Unload Me

End Sub

Private Sub cmdRetrieveSt_Click()

    Dim strParam As String
    Dim lLen As Long
    Dim strErrMsg As String
    Dim strXMLPath As String
    Dim strFindXMLPath As String

    strParam = txtRetrieveSt.Text
    strErrMsg = ""
    strFindXMLPath = ""

    ' Obtains the statistics of the device and stores it in a file.
    With OPOSPOSPrinter1
        'Obtains the statistics of the device.
        .RetrieveStatistics strParam
        If (.ResultCode <> OPOS_SUCCESS) Then
            strErrMsg = "RetrieveStatistics method error." + vbCrLf + vbCrLf
            strErrMsg = strErrMsg + "ResultCode = " + CStr(.ResultCode) + vbCrLf
            strErrMsg = strErrMsg + "ResultCodeExtended = " + CStr(.ResultCodeExtended)
            MsgBox strErrMsg, vbOKOnly + vbExclamation, "Printer"
            Exit Sub
        End If
    End With
    
    strXMLPath = App.Path + "\Sample.xml"
    'Delete XML file.
    strFindXMLPath = Dir(strXMLPath)
    If strFindXMLPath <> "" Then
        Kill (strXMLPath)
    End If
    'Create XML File.
    Open strXMLPath For Binary Access Write As #1
        Put #1, , strParam
    Close #1
    
    'Opens another window and indicates the information of the XML file.
    Step14Browser.Show

End Sub

Private Sub OPOSPOSPrinter1_ErrorEvent(ByVal ResultCode As Long, ByVal ResultCodeExtended As Long, ByVal ErrorLocus As Long, pErrorResponse As Long)

    Dim lRet As Long
    
    lRet = MsgBox("Printer Error." + vbCrLf + vbCrLf + "ResultCode = " + CStr(ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(ResultCodeExtended), vbInformation + vbRetryCancel)
    
    If lRet = vbCancel Then
        pErrorResponse = OPOS_ER_CLEAR
    End If

End Sub

Private Sub OPOSPOSPrinter1_OutputCompleteEvent(ByVal OutputID As Long)

'Notify that printing is completed when it is asnchronous.
    MsgBox "Complete printing", vbInformation

End Sub


Private Sub OPOSPOSPrinter1_StatusUpdateEvent(ByVal Data As Long)
'When there is a change of the status on the printer, the event is fired.

    Dim bRecEnb As Boolean

    bRecEnb = True

'Make messages for the each event information.
    Select Case Data
    Case PTR_SUE_COVER_OPEN         'Printer cover is open.
        bRecEnb = False
    Case PTR_SUE_REC_EMPTY          'No receipt paper.
        bRecEnb = False
    End Select

        With OPOSPOSPrinter1
            'Check receipt function and set button state.
            If .CapRecPresent = True Then
                cmdPrint.Enabled = bRecEnb
                cmdAsync.Enabled = bRecEnb
                cmdReceipt.Enabled = bRecEnb
                Frame1.Enabled = bRecEnb
            Else
                cmdPrint.Enabled = False
                cmdAsync.Enabled = False
                cmdReceipt.Enabled = False
                Frame1.Enabled = False
            End If
    
            'Check rotate print function and set button state.
                If (.CapRecLeft90 = False) Or (.CapRecRight90 = False) Then
                cmdReceipt.Enabled = False
                End If

            'Check slip function and set button state.
            If (.CapSlpPresent = True) Then
                cmdPrintSales.Enabled = True
                Frame2.Enabled = True
            Else
                cmdPrintSales.Enabled = False
                Frame2.Enabled = False
            End If
        End With
    
    cmdExit.Enabled = True
    Frame2.Enabled = False

End Sub


Private Sub Form_Load()

    Dim strParam As String
    Dim RetryCount As Long

    With OPOSPOSPrinter1
        .Open "Unit1"
        'Check whether the device is succeed to open, or not
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to open the device."
            GoTo LoadError
            Exit Sub
        End If
        
        .ClaimDevice 1000
        'Check whether the device is claim to use, or not
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to claim the device."
            GoTo LoadError
        End If

        .DeviceEnabled = True
        'Check whether the device is enable to use, or not
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Disable to use the device."
            GoTo LoadError
            Exit Sub
        End If
        
        .MapMode = PTR_MM_METRIC
        .RecLetterQuality = True
        
        If .CapRecBitmap = True Then
            RetryCount = 0
            Do While RetryCount < 5
                .SetBitmap 1, PTR_S_RECEIPT, App.Path + "\Logo.bmp", .RecLineWidth / 2, PTR_BM_CENTER
                If (.ResultCode = OPOS_E_ILLEGAL) And (.ResultCodeExtended = OPOS_EX_DEVBUSY) Then
                    RetryCount = RetryCount + 1
                    Sleep 1000
                Else
                    Exit Do
                End If
            Loop
            
            If .ResultCode <> OPOS_SUCCESS Then
                MsgBox "Fails to set bitmap."
                GoTo LoadError
            End If
        End If

        If (.CapRecLeft90 = False) Or (.CapRecRight90 = False) Then
            cmdReceipt.Enabled = False
        End If
        If (.CapSlpPresent = False) Or (.CapSlpFullslip = False) Then
            cmdPrintSales.Enabled = False
        End If
        
        ' Set the edit box of parameter input.
        strParam = "ModelName,HoursPoweredCount"
        If .CapRecPresent = True Then
            strParam = strParam + ",ReceiptCharacterPrintedCount"
        ElseIf .CapSlpPresent = True Then
            strParam = strParam + ",SlipCharacterPrintedCount"
        End If
        txtRetrieveSt.Text = strParam
        
        ' Checks whether it has function to obtain
        ' the statistics of devices.
        ' If it does not have the function, invalidates
        ' the [Retrieve Statistics] button and the edit box
        ' of parameter input.
        If .CapStatisticsReporting = False Then
            cmdRetrieveSt.Enabled = False
            txtRetrieveSt.Enabled = False
            Frame5.Enabled = False
        End If
       
    End With

    Frame2.Enabled = False

    Exit Sub

'Error disposal
LoadError:
    Dim OBJ As Object
    'Disable all buttons
    For Each OBJ In Me
        If OBJ.Name <> "OPOSPOSPrinter1" Then
            OBJ.Enabled = False
        End If
    Next
    'Enable to [Close] button only.
    cmdExit.Enabled = True

End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSPOSPrinter1
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    End With

End Sub

