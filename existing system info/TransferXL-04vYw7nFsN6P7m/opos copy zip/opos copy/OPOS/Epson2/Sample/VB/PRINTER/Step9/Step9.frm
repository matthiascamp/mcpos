VERSION 5.00
Object = "{CCB90150-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSPOSPrinter.ocx"
Begin VB.Form Step9 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 9 Print on slips."
   ClientHeight    =   4740
   ClientLeft      =   3045
   ClientTop       =   3330
   ClientWidth     =   3795
   LinkTopic       =   "Form7"
   MaxButton       =   0   'False
   ScaleHeight     =   4740
   ScaleWidth      =   3795
   Begin VB.CommandButton cmdExit 
      Cancel          =   -1  'True
      Caption         =   "Close"
      Height          =   330
      Left            =   2520
      TabIndex        =   6
      Top             =   4095
      Width           =   1065
   End
   Begin VB.Frame Frame1 
      Caption         =   "Receipt"
      Height          =   2220
      Left            =   210
      TabIndex        =   0
      Top             =   210
      Width           =   3375
      Begin VB.CommandButton cmdReceipt 
         Caption         =   "Print Receipt"
         Height          =   435
         Left            =   315
         TabIndex        =   3
         Top             =   1440
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
      Begin VB.CommandButton cmdPrint 
         Caption         =   "Print"
         Height          =   435
         Left            =   315
         TabIndex        =   1
         Top             =   420
         Width           =   2775
      End
   End
   Begin VB.Frame Frame2 
      Caption         =   "Slip"
      Height          =   1170
      Left            =   210
      TabIndex        =   4
      Top             =   2625
      Width           =   3375
      Begin VB.CommandButton cmdPrintSales 
         Caption         =   "Print Sales Slip"
         Height          =   435
         Left            =   315
         TabIndex        =   5
         Top             =   420
         Width           =   2775
      End
   End
   Begin OposPOSPrinter_CCOCtl.OPOSPOSPrinter OPOSPOSPrinter1 
      Left            =   1920
      OleObjectBlob   =   "Step9.frx":0000
      Top             =   4080
   End
End
Attribute VB_Name = "Step9"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
' Step 9 Print on slips.
Option Explicit

Private Type ITEMDATA
    Name As String
    Price As Long
End Type

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

    MousePointer = vbHourglass

    ESC = Chr(&H1B)
    fDate = Format(Now, "mmmm dd, yyyy  AM/PM h:mm")
    BcData = "4902720005074"

' Make a data of the buying goods
    idBuf(0).Name = "apples":       idBuf(0).Price = 10
    idBuf(1).Name = "grapes":       idBuf(1).Price = 20
    idBuf(2).Name = "bananas":      idBuf(2).Price = 30
    idBuf(3).Name = "lemons":       idBuf(3).Price = 40
    idBuf(4).Name = "oranges":      idBuf(4).Price = 50

    With OPOSPOSPrinter1
        .TransactionPrint PTR_S_RECEIPT, PTR_TP_TRANSACTION
        
        .PrintNormal PTR_S_RECEIPT, ESC + "|1B"
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
        .PrintBarCode PTR_S_RECEIPT, BcData, PTR_BCS_JAN13, 1000, .RecLineWidth, PTR_BC_CENTER, PTR_BC_TEXT_BELOW
        .PrintNormal PTR_S_RECEIPT, ESC + "|fP"
        
        .TransactionPrint PTR_S_RECEIPT, PTR_TP_NORMAL
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

    Dim lValue As Long
    Dim i As Integer
    Dim idBuf(5) As ITEMDATA
    Dim ESC As String * 1
    Dim fDate As String
    Dim BcData  As String
    Dim sBuf As String
    Dim sPrice As String
    Dim sValue As String

    MousePointer = vbHourglass

    ESC = Chr(&H1B)
    fDate = Format(Now, "mmmm dd, yyyy  AM/PM h:mm")
    BcData = "4902720005074"

' Make a data of the buying goods
    idBuf(0).Name = "apples":       idBuf(0).Price = 10
    idBuf(1).Name = "grapes":       idBuf(1).Price = 20
    idBuf(2).Name = "bananas":      idBuf(2).Price = 30
    idBuf(3).Name = "lemons":       idBuf(3).Price = 40
    idBuf(4).Name = "oranges":      idBuf(4).Price = 50

    With OPOSPOSPrinter1
        .AsyncMode = True
        .TransactionPrint PTR_S_RECEIPT, PTR_TP_TRANSACTION
        
        .PrintNormal PTR_S_RECEIPT, ESC + "|1B"
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
        sValue = MakePrintString((.RecLineChars \ 2), sBuf, sPrice)     'Because the width of characters of total is doubled, take this into consideration when computing.
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
        .PrintBarCode PTR_S_RECEIPT, BcData, PTR_BCS_JAN13, 1000, .RecLineWidth, PTR_BC_CENTER, PTR_BC_TEXT_BELOW
        .PrintNormal PTR_S_RECEIPT, ESC + "|fP"
        
        .TransactionPrint PTR_S_RECEIPT, PTR_TP_NORMAL
        .AsyncMode = False
    End With

    MousePointer = vbDefault

End Sub

Private Sub cmdReceipt_Click()

    Dim rcSpacing As Long
    Dim rcHeight As Long
    Dim ESC As String * 1
    Dim fDate As String

    MousePointer = vbHourglass

    ESC = Chr(&H1B)
    fDate = Format(Now, "mmmm dd, yyyy  AM/PM h:mm")
    
    With OPOSPOSPrinter1
        rcSpacing = .RecLineSpacing             'Keep the default line spacing
        rcHeight = .RecLineHeight               'Keep the default line height
        .TransactionPrint PTR_S_RECEIPT, PTR_TP_TRANSACTION

        .RotatePrint PTR_S_RECEIPT, PTR_RP_LEFT90
        
        .PrintNormal PTR_S_RECEIPT, ESC + "|4C" + ESC + "|bC" + "   Receipt     "
        .PrintNormal PTR_S_RECEIPT, ESC + "|3C" + ESC + "|2uC" + "       Mr. Brawn" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|2uC" + "                                                  " + vbCrLf + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|2uC" + ESC + "|3C" + "        Total payment              $" + ESC + "|4C" + "21.00  " + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|1C" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, fDate + " Received" + vbCrLf + vbCrLf
        .RecLineHeight = 24
        .RecLineSpacing = .RecLineHeight
        .PrintNormal PTR_S_RECEIPT, ESC + "|uC" + " Details               " + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|1C" + "                          " + ESC + "|2C" + "OPOS Store" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|uC" + " Tax excluded    $20.00" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|1C" + "                          " + ESC + "|bC" + "Zip code 999-9999" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|uC" + " Tax(5%)        $1.00" + ESC + "|N" + "    Phone#(9999)99-9998" + vbCrLf

        .RotatePrint PTR_S_RECEIPT, PTR_RP_NORMAL

        .PrintNormal PTR_S_RECEIPT, ESC + "|fP"

        ' Wait until device is 'OPOS_S_IDLE'
        While .State <> OPOS_S_IDLE
        Wend
        'Print all the buffer data, and exit the batch processing mode.
        .TransactionPrint PTR_S_RECEIPT, PTR_TP_NORMAL
        
        .RecLineSpacing = rcSpacing
        .RecLineHeight = rcHeight
    End With

    MousePointer = vbDefault

End Sub

'<<< Step 9 >>>
'
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
    Do
        Select Case MsgBox("Insert Slip", vbOKCancel + vbInformation)
        Case vbOK                   'seleced [OK]
            With OPOSPOSPrinter1
                .BeginInsertion 5000    'wait time is 5 minute from set paper
                .EndInsertion
                ' Insert paper is success to loop out
                If .ResultCode = OPOS_SUCCESS Then Exit Do
            End With
        Case vbCancel               ' selected [Cancel]
            Exit Sub                    'Exit disposal
        End Select
    Loop

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

    ' Clean up
    MousePointer = vbDefault

    'Remove the slip at the slip station.
    With OPOSPOSPrinter1
        .BeginRemoval 10000
        .EndRemoval
    End With

End Sub

Private Sub cmdExit_Click()

    Unload Me

End Sub

Private Sub OPOSPOSPrinter1_OutputCompleteEvent(ByVal OutputID As Long)

'Notify that printing is completed when it is asnchronous.
    MsgBox "Complete printing", vbInformation

End Sub


Private Sub Form_Load()

    With OPOSPOSPrinter1
        .Open "Unit1"
        .ClaimDevice 1000
        .DeviceEnabled = True
        
        .MapMode = PTR_MM_METRIC
        .RecLetterQuality = True
        
        If .CapRecBitmap = True Then
            .SetBitmap 1, PTR_S_RECEIPT, App.Path + "\Logo.bmp", .RecLineWidth / 2, PTR_BM_CENTER
        End If
        
        'Check on rotation print function
        If (.CapRecLeft90 = False) Or (.CapRecRight90 = False) Then
            ' Not function to [Print Receipt] button is disable
            cmdReceipt.Enabled = False
        End If
        ' <<< Step 9 >>>
        'Check on slip function
        If (.CapSlpPresent = False) Or (.CapSlpFullslip = False) Then
            ' Not function to [Print Sales Slip] button is disable
            cmdPrintSales.Enabled = False
        End If
    End With

End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSPOSPrinter1
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    End With

End Sub


