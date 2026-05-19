VERSION 5.00
Object = "{CCB90150-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSPOSPrinter.ocx"
Begin VB.Form Step18 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 18 PrintMemoryBitmap"
   ClientHeight    =   4530
   ClientLeft      =   3045
   ClientTop       =   3330
   ClientWidth     =   7365
   LinkTopic       =   "Form8"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   4530
   ScaleWidth      =   7365
   Begin VB.Frame Frame4 
      Caption         =   "DirectIO"
      Height          =   3375
      Left            =   3780
      TabIndex        =   15
      Top             =   210
      Width           =   3375
      Begin VB.Frame Frame3 
         Caption         =   "maintenance counter"
         Height          =   1590
         Left            =   105
         TabIndex        =   16
         Top             =   1575
         Width           =   3165
         Begin VB.TextBox Text1 
            Height          =   270
            Left            =   210
            TabIndex        =   8
            Top             =   705
            Width           =   2505
         End
         Begin VB.CommandButton cmdMaintenance 
            Caption         =   "Cumulative"
            Height          =   375
            Index           =   2
            Left            =   1935
            TabIndex        =   11
            Top             =   1035
            Width           =   1095
         End
         Begin VB.CommandButton cmdMaintenance 
            Caption         =   "Get"
            Height          =   375
            Index           =   1
            Left            =   1080
            TabIndex        =   10
            Top             =   1035
            Width           =   735
         End
         Begin VB.CommandButton cmdMaintenance 
            Caption         =   "Reset"
            Height          =   375
            Index           =   0
            Left            =   225
            TabIndex        =   9
            Top             =   1035
            Width           =   735
         End
         Begin VB.ComboBox Combo1 
            Height          =   300
            ItemData        =   "Step18.frx":0000
            Left            =   210
            List            =   "Step18.frx":001B
            Style           =   2  'Dropdown List
            TabIndex        =   7
            Top             =   345
            Width           =   2745
         End
      End
      Begin VB.CommandButton cmdNVRAM 
         Caption         =   "Use NVRAM"
         Height          =   435
         Left            =   210
         TabIndex        =   6
         Top             =   840
         Width           =   2955
      End
      Begin VB.CommandButton cmdShiftPrint 
         Caption         =   "Shift Print Position"
         Height          =   435
         Left            =   210
         TabIndex        =   5
         Top             =   315
         Width           =   2955
      End
   End
   Begin VB.CommandButton cmdExit 
      Cancel          =   -1  'True
      Caption         =   "Close"
      Height          =   330
      Left            =   6090
      TabIndex        =   12
      Top             =   3885
      Width           =   1065
   End
   Begin VB.Frame Frame1 
      Caption         =   "Receipt"
      Height          =   2730
      Left            =   240
      TabIndex        =   14
      Top             =   120
      Width           =   3330
      Begin VB.CommandButton cmdPrintMemoryBitmap 
         Caption         =   "Print memory bitmap"
         Height          =   375
         Left            =   360
         TabIndex        =   17
         Top             =   2160
         Width           =   2775
      End
      Begin VB.CommandButton cmdPageMode 
         Caption         =   "Coupon ticket printing"
         Height          =   375
         Left            =   360
         TabIndex        =   3
         Top             =   1680
         Width           =   2775
      End
      Begin VB.CommandButton cmdReceipt 
         Caption         =   "Print Receipt"
         Height          =   375
         Left            =   360
         TabIndex        =   2
         Top             =   1200
         Width           =   2775
      End
      Begin VB.CommandButton cmdAsync 
         Caption         =   "Asynchronous printing"
         Height          =   375
         Left            =   360
         TabIndex        =   1
         Top             =   720
         Width           =   2775
      End
      Begin VB.CommandButton cmdPrint 
         Caption         =   "Print"
         Height          =   375
         Left            =   360
         TabIndex        =   0
         Top             =   240
         Width           =   2775
      End
   End
   Begin VB.Frame Frame2 
      Caption         =   "Slip"
      Height          =   825
      Left            =   240
      TabIndex        =   13
      Top             =   3000
      Width           =   3375
      Begin VB.CommandButton cmdPrintSales 
         Caption         =   "Print Sales Slip"
         Height          =   405
         Left            =   360
         TabIndex        =   4
         Top             =   240
         Width           =   2775
      End
   End
   Begin OposPOSPrinter_CCOCtl.OPOSPOSPrinter OPOSPOSPrinter1 
      Left            =   5040
      OleObjectBlob   =   "Step18.frx":0111
      Top             =   3840
   End
End
Attribute VB_Name = "Step18"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
' Step 15 PageMode-Prints

Option Explicit

Dim m_bStateCover As Boolean    'Cover open state
Dim m_bStatePaper As Boolean    'Paper empty state
Dim m_bCoverSensor As Boolean   'CapCoverSensor

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
    Dim i As Integer
    Dim idBuf(5) As ITEMDATA
    Dim ESC As String * 1
    Dim fDate As String
    Dim BcData  As String
    Dim sBuf As String
    Dim sPrice As String
    Dim sValue As String
    Dim sRecLineChars() As String
    Dim lRecLineCharsCount As Long

    If OPOSPOSPrinter1.CapRecPresent = False Then
        MsgBox "This Printer doesn't have Receipt Station.", vbExclamation
        Exit Sub
    End If

' Initialization
    MousePointer = vbHourglass
    ESC = Chr(&H1B)
    fDate = Format(Now, "mmmm dd, yyyy  AM/PM h:mm")
    BcData = "4902720005074"
    bExit = False

' Make a data of the buying goods
    idBuf(0).Name = "apples":       idBuf(0).Price = 10
    idBuf(1).Name = "grapes":       idBuf(1).Price = 20
    idBuf(2).Name = "bananas":      idBuf(2).Price = 30
    idBuf(3).Name = "lemons":       idBuf(3).Price = 40
    idBuf(4).Name = "oranges":      idBuf(4).Price = 50

    With OPOSPOSPrinter1
        .TransactionPrint PTR_S_RECEIPT, PTR_TP_TRANSACTION
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Cannot use a POS Printer.", vbExclamation
            MousePointer = vbDefault
            Exit Sub
        End If
        
        'Loop
        Do
            If .CapRecBitmap = True Then
                .PrintNormal PTR_S_RECEIPT, ESC + "|1B"
            End If
            
            .PrintNormal PTR_S_RECEIPT, ESC + "|N" + "123xxstreet,xxxcity,xxxxstate " + vbLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|rA" + "TEL 9999-99-9999   C#2" + vbLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|200uF"
            
            'Change of the font size
            lRecLineCharsCount = GetRecLineChars(sRecLineChars)
            If lRecLineCharsCount >= 2 Then
                .RecLineChars = sRecLineChars(1)
                .PrintNormal PTR_S_RECEIPT, ESC + "|cA" + fDate + vbLf
                .RecLineChars = sRecLineChars(0)
            Else
                .PrintNormal PTR_S_RECEIPT, ESC + "|cA" + fDate + vbLf
            End If
        
            .PrintNormal PTR_S_RECEIPT, ESC + "|500uF"
        'Print buying goods
            lValue = 0
            For i = LBound(idBuf) To UBound(idBuf) - 1
                If .ResultCode <> OPOS_SUCCESS Then Exit For
                sBuf = idBuf(i).Name
                lValue = lValue + idBuf(i).Price
                sPrice = Format(idBuf(i).Price, "$#.00")
                sValue = MakePrintString(.RecLineChars, sBuf, sPrice)
                .PrintNormal PTR_S_RECEIPT, sValue + vbLf
            Next
            .PrintNormal PTR_S_RECEIPT, ESC + "|200uF"
        'Print the total cost
            sBuf = "Before adding tax"
            sPrice = Format(lValue, "$#.00")
            sValue = MakePrintString(.RecLineChars, sBuf, sPrice)
            .PrintNormal PTR_S_RECEIPT, ESC + "|bC" + sValue + vbLf
            sBuf = "tax   5.0%"
            sPrice = Format(lValue * 0.05, "$#.00")
            sValue = MakePrintString(.RecLineChars, sBuf, sPrice)
            .PrintNormal PTR_S_RECEIPT, ESC + "|N" + ESC + "|uC" + sValue + vbLf
            sBuf = "total"
            sPrice = Format(lValue * 1.05, "$#.00")
            sValue = MakePrintString((.RecLineChars \ 2), sBuf, sPrice)
            .PrintNormal PTR_S_RECEIPT, ESC + "|N" + ESC + "|bC" + ESC + "|2C" + sValue + vbLf
            sBuf = "Customer's payment"
            sPrice = Format(200, "$#.00")
            sValue = MakePrintString(.RecLineChars, sBuf, sPrice)
            .PrintNormal PTR_S_RECEIPT, ESC + "|N" + sValue + vbLf
            sBuf = "Change"
            sPrice = Format(200 - lValue * 1.05, "$#.00")
            sValue = MakePrintString(.RecLineChars, sBuf, sPrice)
            .PrintNormal PTR_S_RECEIPT, sValue + vbLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|500uF"
            
            If .CapRecBarCode = True Then
                .PrintBarCode PTR_S_RECEIPT, BcData, PTR_BCS_JAN13, 1000, .RecLineWidth, PTR_BC_CENTER, PTR_BC_TEXT_BELOW
            End If
            
            .PrintNormal PTR_S_RECEIPT, ESC + "|" + CStr(.RecLinesToPaperCut) + "lF"
            If .CapRecPapercut = True Then
                .CutPaper 100
            End If
            
            If .ResultCode = OPOS_SUCCESS Then Exit Do
            
        'When error occurs, display a message to ask the user whether retry or not.
            Select Case MsgBox("Fails to output to a printer." + vbCrLf + vbCrLf + "Retry?", vbAbortRetryIgnore + vbQuestion)
            Case vbAbort                    ' "Cancel"has been selected
                .ClearOutput
                bExit = True
                Exit Do
            Case vbRetry                    ' "Retry"has been selected.
                .ClearOutput
            Case vbIgnore                   ' "Ignore" has been selected.
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

Private Function GetRecLineChars(ByRef sRecLineChars() As String)
    Dim lIndex As Long
    Dim lCount As Long
    Dim sRecLineCharsList As String
    Dim i As Integer
    Dim lStartIndex As Long
    Dim lEndIndex As Long
        
        
    sRecLineCharsList = OPOSPOSPrinter1.RecLineCharsList
        
    If Len(sRecLineCharsList) = 0 Then
        GetRecLineChars = 0
    Else
        'Calculate the element count.
        lCount = 1
        lIndex = InStr(1, sRecLineCharsList, ",")
        While lIndex <> 0
            lCount = lCount + 1
            lIndex = lIndex + 1
            lIndex = InStr(lIndex, sRecLineCharsList, ",")
        Wend

        'Set the element to array.
        ReDim sRecLineChars(lCount)
    
        lStartIndex = 1
        For i = 0 To lCount - 1
            lEndIndex = InStr(lStartIndex, sRecLineCharsList, ",")
            If lEndIndex = 0 Then
                lEndIndex = Len(sRecLineCharsList)
            End If
            
            sRecLineChars(i) = Mid(sRecLineCharsList, lStartIndex, lEndIndex - 1)
            lStartIndex = lEndIndex + 1
        Next
    
        GetRecLineChars = lCount

    End If

End Function

Private Sub cmdAsync_Click()

    Dim bExit As Boolean
    Dim lValue As Long
    Dim i As Integer
    Dim idBuf(5) As ITEMDATA
    Dim ESC As String * 1
    Dim fDate As String
    Dim BcData  As String
    Dim sBuf As String
    Dim sPrice As String
    Dim sValue As String

    If OPOSPOSPrinter1.CapRecPresent = False Then
        MsgBox "This Printer doesn't have Receipt Station.", vbExclamation
        Exit Sub
    End If

' Initialization
    MousePointer = vbHourglass
    ESC = Chr(&H1B)
    fDate = Format(Now, "mmmm dd, yyyy  AM/PM h:mm")
    BcData = "4902720005074"
    bExit = False

' Make a data of the buying goods
    idBuf(0).Name = "apples":       idBuf(0).Price = 10
    idBuf(1).Name = "grapes":       idBuf(1).Price = 20
    idBuf(2).Name = "bananas":      idBuf(2).Price = 30
    idBuf(3).Name = "lemons":       idBuf(3).Price = 40
    idBuf(4).Name = "oranges":      idBuf(4).Price = 50

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
            If .CapRecBitmap = True Then
                .PrintNormal PTR_S_RECEIPT, ESC + "|1B"
            End If
            
            .PrintNormal PTR_S_RECEIPT, ESC + "|N" + "123xxstreet,xxxcity,xxxxstate " + vbLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|rA" + "TEL 9999-99-9999   C#2" + vbLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|200uF"
            .PrintNormal PTR_S_RECEIPT, ESC + "|cA" + fDate + vbLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|500uF"
        'Print buying goods
            lValue = 0
            For i = LBound(idBuf) To UBound(idBuf) - 1
                If .ResultCode <> OPOS_SUCCESS Then Exit For
                sBuf = idBuf(i).Name
                lValue = lValue + idBuf(i).Price
                sPrice = Format(idBuf(i).Price, "$#.00")
                sValue = MakePrintString(.RecLineChars, sBuf, sPrice)
                .PrintNormal PTR_S_RECEIPT, sValue + vbLf
            Next
            .PrintNormal PTR_S_RECEIPT, ESC + "|200uF"
        'Print the total cost
            sBuf = "Tax excluded."
            sPrice = Format(lValue, "$#.00")
            sValue = MakePrintString(.RecLineChars, sBuf, sPrice)
            .PrintNormal PTR_S_RECEIPT, ESC + "|bC" + sValue + vbLf
            sBuf = "Tax  5.0%"
            sPrice = Format(lValue * 0.05, "$#.00")
            sValue = MakePrintString(.RecLineChars, sBuf, sPrice)
            .PrintNormal PTR_S_RECEIPT, ESC + "|N" + ESC + "|uC" + sValue + vbLf
            sBuf = "Total"
            sPrice = Format(lValue * 1.05, "$#.00")
            sValue = MakePrintString((.RecLineChars \ 2), sBuf, sPrice)       'Because the width of characters of total is doubled, take this into consideration when computing.
            .PrintNormal PTR_S_RECEIPT, ESC + "|N" + ESC + "|bC" + ESC + "|2C" + sValue + vbLf
            sBuf = "Customer's payment"
            sPrice = Format(200, "$#.00")
            sValue = MakePrintString(.RecLineChars, sBuf, sPrice)
            .PrintNormal PTR_S_RECEIPT, ESC + "|N" + sValue + vbLf
            sBuf = "Change"
            sPrice = Format(200 - lValue * 1.05, "$#.00")
            sValue = MakePrintString(.RecLineChars, sBuf, sPrice)
            .PrintNormal PTR_S_RECEIPT, sValue + vbLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|500uF"
            
            If .CapRecBarCode = True Then
                .PrintBarCode PTR_S_RECEIPT, BcData, PTR_BCS_JAN13, 1000, .RecLineWidth, PTR_BC_CENTER, PTR_BC_TEXT_BELOW
            End If
            
            .PrintNormal PTR_S_RECEIPT, ESC + "|" + CStr(.RecLinesToPaperCut) + "lF"
            If .CapRecPapercut = True Then
                .CutPaper 100
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



' <<< Step 12 >>>
' Prints Bitmaps and Barcodes on receipts using the
' RotatedPrinting mode of Bitmap and Barcode.
' If your printing device's printing area is too narrow or small,
' the original printing layout may not be kept intact.

Private Sub cmdReceipt_Click()

    Dim bExit As Boolean
    Dim rcSpacing As Long
    Dim rcHeight As Long
    Dim ESC As String * 1
    Dim fDate As String
    Dim BcData  As String
    Dim RotateType As Long
    Dim bBitmapPrint As Boolean
    Dim bBarcodePrint As Boolean
    
'Sets BitmapMode to NORMAL
    'Dim pData As Long
    'Dim pString As String

    If OPOSPOSPrinter1.CapRecPresent = False Then
        MsgBox "This Printer doesn't have Receipt Station.", vbExclamation
        Exit Sub
    End If

'Check Rotate Function
    If OPOSPOSPrinter1.CapRecLeft90 = False Then
        MsgBox "This printer doesn't have a rotation printing function.", vbExclamation
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
    fDate = Format(Now, "mmmm dd, yyyy  AM/PM h:mm")
    BcData = "4902720005074"

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
            rcSpacing = .RecLineSpacing                'Keep the default line spacing
            rcHeight = .RecLineHeight                  'Keep the default line height
            
            'Printing process
            
        'Sets BitmapMode to NORMAL
            'pData = PTR_DI_BMP_NORMAL
            'pString = ""
            '.DirectIO PTR_DI_SET_BITMAP_MODE, pData, pString
            
            If (bBitmapPrint) Then
                .PrintBitmap PTR_S_RECEIPT, App.Path + "\Logo.bmp", .RecLineWidth / 5, PTR_BM_CENTER
            End If
            
            .PrintNormal PTR_S_RECEIPT, ESC + "|4C" + ESC + "|bC" + "   Receipt     "
            .PrintNormal PTR_S_RECEIPT, ESC + "|3C" + ESC + "|2uC" + "       Mr. Brawn" + vbCrLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|2uC" + "                                                  " + vbCrLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|2uC" + ESC + "|3C" + "        Total payment              $" + ESC + "|4C" + "21.00  "
            .PrintNormal PTR_S_RECEIPT, ESC + "|1C" + vbCrLf
            .PrintNormal PTR_S_RECEIPT, fDate + " Received" + vbCrLf + vbCrLf
            .RecLineHeight = 24
            .RecLineSpacing = .RecLineHeight
            .PrintNormal PTR_S_RECEIPT, ESC + "|uC" + " Details               " + vbCrLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|1C" + "                          " + ESC + "|2C" + "OPOS Store" + vbCrLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|uC" + " Tax excluded    $20.00" + vbCrLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|1C" + "                          " + ESC + "|bC" + "Zip code 999-9999" + vbCrLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|uC" + " Tax(5%)        $1.00" + ESC + "|N" + "    Phone#(9999)99-9998" + vbCrLf + vbCrLf

            If (bBarcodePrint) Then
                .PrintBarCode PTR_S_RECEIPT, BcData, PTR_BCS_JAN13, 500, .RecLineWidth / 2, PTR_BC_CENTER, PTR_BC_TEXT_BELOW
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
                .PrintNormal PTR_S_RECEIPT, ESC + "|" + CStr(.RecLinesToPaperCut) + "lF"
                If .CapRecPapercut = True Then          'ut function, or not.
                    .CutPaper 100
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

' <<< Step 15 >>>
' Prints coupon ticket on receipts using the PageModePrinting mode.
' If your printing device's printing area is too narrow or small,
' the original printing layout may not be kept intact.

Private Sub cmdPageMode_Click()
    Dim lPMDescriptorList(2) As Long
    Dim lGetPMDescriptor As Long
    Dim lCount As Long
    Dim lVPosition As Long
    
    Dim bBitmapPrint As Boolean
    Dim bBarcodePrint As Boolean
    
    Dim ESC As String * 1
    Dim fDate As String
    Dim BcData  As String
    Dim strOutputData As String
    
    Dim strPMArea As String
    Dim strMaxHArea As String
    Dim strMaxVArea As String
    Dim strSetHPositon As String
    Dim strSetVPosition As String
    
    If OPOSPOSPrinter1.CapRecPresent = False Then
        MsgBox "This Printer doesn't have Receipt Station.", vbExclamation
        Exit Sub
    End If
'Check PageMode Function
    If OPOSPOSPrinter1.CapRecPageMode = False Then
        MsgBox "This printer doesn't have a PageMode printing function.", vbExclamation
        Exit Sub
    End If

' Initialization
    ESC = Chr(&H1B)
    fDate = Format(Now, "mmmm dd, yyyy  AM/PM h:mm")
    BcData = "4902720005074"
    
    lPMDescriptorList(0) = PTR_PM_BM_ROTATE
    lPMDescriptorList(1) = PTR_PM_BC_ROTATE
    lPMDescriptorList(2) = PTR_PM_OPAQUE

    With OPOSPOSPrinter1
        .PageModeStation = PTR_S_RECEIPT
        lGetPMDescriptor = .PageModeDescriptor
        ' Select of target station of PageMode
        For lCount = 2 To 0 Step -1
            If (lPMDescriptorList(lCount) <= lGetPMDescriptor) Then
                lGetPMDescriptor = lGetPMDescriptor - lPMDescriptorList(lCount)
                Select Case lCount
                    Case 0
                        If .CapRecBitmap = True Then
                            If InStr(.RecBitmapRotationList, "R90") <> 0 Then
                                bBitmapPrint = True
                            End If
                        End If
                    Case 1
                        If .CapRecBarCode = True Then
                            If InStr(.RecBarCodeRotationList, "R90") <> 0 Then
                                bBarcodePrint = True
                            End If
                        End If
                End Select
            End If
        Next
        
        ' Initialization of PageMode area
        .PageModePrintArea = "0,0,0,0"
        .PageModeHorizontalPosition = 0
        .PageModeVerticalPosition = 0
        
        .PageModePrintDirection = PTR_PD_LEFT_TO_RIGHT
        strPMArea = .PageModeArea
        ' Gets the maximum size of PageMode area
        lCount = InStr(strPMArea, ",")
        strMaxHArea = Mid(strPMArea, 1, (lCount - 1))
        strMaxVArea = Mid(strPMArea, (lCount + 1))
        ' first PageMode area
        strSetVPosition = Str(.RecLineSpacing * 2)
        strPMArea = "0,0," + strMaxHArea + "," + strSetVPosition
        .PageModePrintArea = strPMArea
        
         ' PageMode
        .PageModePrint PTR_PM_PAGE_MODE
        
        strOutputData = "OPOS Store"
        lCount = (.RecLineChars - LenB(strOutputData)) / 4
        .PrintNormal PTR_S_RECEIPT, ESC + "|4C" + ESC + "|cA" + ESC + "|2uC" + Space(lCount) + strOutputData + Space(lCount) + vbCrLf
        ' Right90
        If (Val(strMaxVArea) > 12000) Then
            ' Setting of Vertical Maximum value
            strMaxVArea = "12000"
        End If
        ' second PageMode area
        .PageModePrintArea = "0," + strSetVPosition + "," + strMaxHArea + "," + Str(Val(strMaxVArea) - Val(strSetVPosition))
        .PageModePrintDirection = PTR_PD_TOP_TO_BOTTOM
        ' Printing bitmap
        If (bBitmapPrint) Then
            .PrintBitmap PTR_S_RECEIPT, App.Path + "\Logo.bmp", .RecLineWidth / 4, PTR_BM_LEFT
        End If
        
        .PageModeHorizontalPosition = (.RecLineWidth / 4) + .RecLineSpacing
        .PageModeVerticalPosition = .RecLineSpacing
        .PrintNormal PTR_S_RECEIPT, ESC + "|4CCoupon ticket" + vbCrLf
        
        .PageModeVerticalPosition = 0
        .PrintNormal PTR_S_RECEIPT, ESC + "|rA123xxStreet,xxCity,xxState" + vbCrLf
        .PageModeVerticalPosition = .RecLineSpacing
        .PrintNormal PTR_S_RECEIPT, ESC + "|rATEL 9999-99-9999" + vbCrLf
        .PageModeVerticalPosition = .RecLineSpacing * 2
        .PrintNormal PTR_S_RECEIPT, ESC + "|rA" + fDate + vbCrLf
        
        .PageModeHorizontalPosition = 0
        lVPosition = .RecLineWidth / 4 'a criterion value of Vertical position
        .PageModeVerticalPosition = lVPosition
        .PrintNormal PTR_S_RECEIPT, "The following amount will be deducted " + vbCrLf + "from your total sales at the register " + vbCrLf + "by showing us this coupon." + vbCrLf
        .PageModeHorizontalPosition = (.RecLineWidth / .RecLineChars) * 3
        .PageModeVerticalPosition = lVPosition + (.RecLineSpacing * 4)
        .PrintNormal PTR_S_RECEIPT, ESC + "|bCper coupon" + vbCrLf

        .PageModeHorizontalPosition = 0
        .PageModeVerticalPosition = lVPosition + (.RecLineSpacing * 4)
        .PrintNormal PTR_S_RECEIPT, ESC + "|2uC" + Space(36) + vbCrLf
        .PageModeVerticalPosition = lVPosition + (.RecLineSpacing * 5)
        .PrintNormal PTR_S_RECEIPT, ESC + "|4C" + ESC + "|2uC      $1.00  OFF  " + vbCrLf
        
        .PageModeHorizontalPosition = (.RecLineWidth / .RecLineChars) * 9
        .PageModeVerticalPosition = lVPosition + (.RecLineSpacing * 7)
        fDate = Format(Now, "mmmm dd,")
        fDate = fDate + Str(Val(Format(Now, "yyyy")) + 1)
        .PrintNormal PTR_S_RECEIPT, ESC + "|bCExpiration Date : " + fDate + vbCrLf
        ' Printing Barcode
        If (bBarcodePrint) Then
            .PageModeHorizontalPosition = 0
            .PageModeVerticalPosition = .RecLineSpacing * 5
            .PrintBarCode PTR_S_RECEIPT, BcData, PTR_BCS_JAN13, 1000, .RecLineWidth / 3, PTR_BC_RIGHT, PTR_BC_TEXT_BELOW
        End If
        
        .PageModePrint PTR_PM_NORMAL
        
        If (.ResultCode = OPOS_SUCCESS) Then
            .PrintNormal PTR_S_RECEIPT, ESC + "|" + CStr(.RecLinesToPaperCut) + "lF"
            If .CapRecPapercut = True Then          'ut function, or not.
                .CutPaper 100
            End If
        Else
            MsgBox "Cannot use a POS Printer" + vbCrLf + "ResultCode = " + CStr(.ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(.ResultCodeExtended), 0, "Print Receipt"
            .PageModePrint PTR_PM_CANCEL
        End If
        
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
    Dim bValiFlg As Boolean
    
'When Validation is used.
'    Dim pData As Long
'    Dim pString As String
       
    bValiFlg = False
       
'When Validation is used.
'    pData = PTR_DI_SLIP_VALIDATION
'    bValiFlg = True
'    OPOSPOSPrinter1.DirectIO PTR_DI_SELECT_SLIP, pData, pString

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
    fName = "ABCDEF"                             'Casher No.
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
    If (bValiFlg = False) Then
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
    End If
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
    
'When Validation is used.
'    pData = PTR_DI_SLIP_FULLSLIP
'    OPOSPOSPrinter1.DirectIO PTR_DI_SELECT_SLIP, pData, pString

End Sub


' <<< Step 11 >>>
'Control the initial position of the printer using the Direct IO.
'Useful for printing neatly.
'
Private Sub cmdShiftPrint_Click()

'   ESC/POS command
'       ESC = n             n = 1
'           Explanation: Printer selection command
'
'       ESC $ nL nH         nL, nH = Voluntary nunber among 0-255
'           Explanation: Move the printing position to nL + nH x 256 from the left side.

    Dim pData As Long
    Dim pString As String

    pData = 0
' Connect a printer directly.(Support Hydra connection)
    pString = Chr(&H1B) + "=" + Chr(1)
' Move the printing position to nL + nH x 256 from the left side.
    pString = pString + Chr(&H1B) + "$" + Chr(100) + Chr(0)
    OPOSPOSPrinter1.DirectIO PTR_DI_OUTPUT_NORMAL, pData, pString
    If OPOSPOSPrinter1.ResultCode <> OPOS_SUCCESS Then
        MsgBox "Cannot use a POS Printer.", vbExclamation
        Exit Sub
    End If


' Test printing
    OPOSPOSPrinter1.PrintNormal PTR_S_RECEIPT, "DirectIO" + vbCrLf
    If OPOSPOSPrinter1.ResultCode <> OPOS_SUCCESS Then
        MsgBox "Cannot use a POS Printer.", vbExclamation
        Exit Sub
    End If


End Sub

' <<< Step 11 >>>
'In using Direct IO, use the NVRAM to print a bitmap .
'
Private Sub cmdNVRAM_Click()

    Dim pData As Long
    Dim pString As String

' Needed to register the bitmap before using it.
' TMLlogo can be start up individually from the Device Specific Settings of the SetupPOS.

    pData = 1           'Number of the registered bitmap.
    pString = ""
    OPOSPOSPrinter1.DirectIO PTR_DI_PRINT_FLASH_BITMAP, pData, pString
    If OPOSPOSPrinter1.ResultCode <> OPOS_SUCCESS Then
        MsgBox "Cannot use a POS Printer.", vbExclamation
        Exit Sub
    End If


' Color bitmap or J7000/7100

'    pData = 2097184     'Number of the registered bitmap.Keycode 32,32(High=32 Low=32); 2097184 = (High * 256& * 256&) + Low
'    pString = ""
'    OPOSPOSPrinter1.DirectIO PTR_DI_PRINT_FLASH_BITMAP2, pData, pString


End Sub

' <<< Step 11 >>>
Private Sub cmdMaintenance_Click(Index As Integer)

    Dim lCommand As Long
    Dim lCounterNum As Long
    Dim strCounter As String

    Select Case Combo1.ListIndex
    Case 0                      'Advance paper(number of lines): Slip
        lCounterNum = &HA
    Case 1                      'Total number of printing characters: Slip(Front)
        lCounterNum = &HB
    Case 2                      'Slip paper feed in terms of number of lines:Roled sheet
        lCounterNum = &H14
    Case 3                      'Numbers of strike on sheet: Roled sheet
        lCounterNum = &H15
    Case 4                      'Number of the checks read
        lCounterNum = &H3C
    Case 5                      'Working time of the printer
        lCounterNum = &H46
    End Select

    Select Case Index
    Case 0                  'Reset
        lCommand = PTR_DI_RESET_MAINTENANCE_COUNTER
    Case 1                  'Get
        lCommand = PTR_DI_GET_MAINTENANCE_COUNTER
    Case 2                  'Cumulative
        lCommand = PTR_DI_GET_MAINTENANCE_COUNTER
        lCounterNum = lCounterNum Or &H80
    End Select

    'In using the DirectIO method, use functions of the maintenance counter.
    If OPOSPOSPrinter1.DirectIO(lCommand, lCounterNum, strCounter) = OPOS_SUCCESS Then
        If Index = 0 Then
            Text1.Text = "Success."
        Else
            Text1.Text = strCounter
        End If
    Else
        Text1.Text = "Error."
    End If

End Sub

Private Sub OPOSPOSPrinter1_ErrorEvent(ByVal ResultCode As Long, ByVal ResultCodeExtended As Long, ByVal ErrorLocus As Long, pErrorResponse As Long)

    If (MsgBox("Printer Error." + vbCrLf + vbCrLf + "ResultCode = " + CStr(ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(ResultCodeExtended), vbOKCancel + vbInformation) = vbCancel) Then
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

'Make messages for the each event information.
    Select Case Data
    Case PTR_SUE_COVER_OPEN         'Printer cover is open.
        m_bStateCover = False
    Case PTR_SUE_REC_EMPTY          'No receipt paper.
        m_bStatePaper = False
    Case PTR_SUE_COVER_OK           'Printer cover is close.
        m_bStateCover = True
    Case PTR_SUE_REC_PAPEROK        'Receipt paper is ok.
        m_bStatePaper = True
    Case PTR_SUE_REC_NEAREMPTY      'Receipt paper is ok.(Near Empty)
        m_bStatePaper = True
    End Select

    If m_bStatePaper = True And (m_bStateCover = True Or m_bCoverSensor = False) Then
        bRecEnb = True
    Else
        bRecEnb = False
    End If
    
    Dim OBJ As Object
    ' All disable to print button.
    For Each OBJ In Me
        If OBJ.Name <> "OPOSPOSPrinter1" Then
            OBJ.Enabled = bRecEnb
        End If
    Next
    ' Enable to [Close] button only.
    cmdExit.Enabled = True

    With OPOSPOSPrinter1
        'Check Rotate Function
        If (.CapRecLeft90 = False) Or (.CapRecRight90 = False) Then
            cmdReceipt.Enabled = False
        End If
        'Check Slip Function.
        If (.CapSlpPresent = False) Or (.CapSlpFullslip = False) Then
            cmdPrintSales.Enabled = False
        End If
        'Check PageMode Function
        If (.CapRecPageMode = False) Then
            cmdPageMode.Enabled = False
        End If
        
    End With

End Sub

Private Sub cmdExit_Click()

    Unload Me

End Sub

Private Sub Form_Load()

    Dim RetryCount As Long

    With OPOSPOSPrinter1
        .Open "Unit1"
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to open the device."
            GoTo LoadError
        End If
        
        .ClaimDevice 1000
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to claim the device."
            GoTo LoadError
        End If
        
        .DeviceEnabled = True
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Disable to use the device."
            GoTo LoadError
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
        If (.CapRecPageMode = False) Then
            cmdPageMode.Enabled = False
        End If

        m_bStateCover = True
        m_bStatePaper = True
        m_bCoverSensor = .CapCoverSensor

    End With

    Combo1.ListIndex = 0
    Exit Sub

' Error disposal
LoadError:
    Dim OBJ As Object
    ' All disable to print button.
    For Each OBJ In Me
        If OBJ.Name <> "OPOSPOSPrinter1" Then
            OBJ.Enabled = False
        End If
    Next
    
    m_bStateCover = False
    m_bStatePaper = False
    m_bCoverSensor = False
    
    ' Enable to [Close] button only.
    cmdExit.Enabled = True

End Sub

    Private Sub Form_Unload(Cancel As Integer)

    With OPOSPOSPrinter1
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    End With

End Sub

' <<< Step 18 >>>
' Prints Bitmaps on receipts using the PrintMemoryBitmap.
' If your printing device's printing area is too narrow or small,
' the original printing layout may not be kept intact.
Private Sub cmdPrintMemoryBitmap_Click()
    Dim strBitmapData As String
    Dim byData As Byte
    Dim strFirstChar As String * 1
    Dim strSecondChar As String * 1
    Dim strHexFormat As String * 2
    Dim BitmapSize As Long
    Dim ByteCounter As Long
    

    If OPOSPOSPrinter1.CapRecPresent = False Then
        MsgBox "This Printer doesn't have Receipt Station.", vbExclamation
        Exit Sub
    End If
      
' Initialization
    MousePointer = vbHourglass
    
    ' Read bitmap file with nibble format.
    strBitmapData = ""
    strFirstChar = ""
    strSecondChar = ""
    
    Open App.Path + "\Logo.bmp" For Binary Access Read As #1
    BitmapSize = FileLen(App.Path + "\Logo.bmp")
    
    For ByteCounter = 0 To BitmapSize - 1
    
            Get #1, , byData
            
            If byData < 16 Then
                strHexFormat = "0" + Hex(byData)
            End If
            
            If byData >= 16 Then
                strHexFormat = Hex(byData)
            End If
                            
            strFirstChar = Left(strHexFormat, 1)
            strFirstChar = Chr(&H30 + Val("&H" + strFirstChar))
            strSecondChar = Right(strHexFormat, 1)
            strSecondChar = Chr(&H30 + Val("&H" + strSecondChar))
            
            strBitmapData = strBitmapData + strFirstChar + strSecondChar
        
    Next ByteCounter
    Close #1
    
' Print the bitmap.
    With OPOSPOSPrinter1
        .BinaryConversion = OPOS_BC_NIBBLE
        
        .PrintMemoryBitmap PTR_S_RECEIPT, strBitmapData, PTR_BMT_BMP, .RecLineWidth / 2, PTR_BM_CENTER
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Cannot use a POS Printer.", vbExclamation
        End If
        
        .BinaryConversion = OPOS_BC_NONE
    End With
    
    
   MousePointer = vbDefault

End Sub

