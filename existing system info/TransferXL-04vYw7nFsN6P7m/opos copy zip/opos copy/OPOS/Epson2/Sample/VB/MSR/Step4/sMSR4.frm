VERSION 5.00
Object = "{CCB90120-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSMSR.ocx"
Begin VB.Form Step4 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 4 Obtains the statistics of the device."
   ClientHeight    =   5085
   ClientLeft      =   45
   ClientTop       =   330
   ClientWidth     =   6210
   LinkTopic       =   "MDIForm1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   5085
   ScaleWidth      =   6210
   Begin VB.Frame Frame5 
      Caption         =   "Device Statistics"
      Height          =   1440
      Left            =   1560
      TabIndex        =   19
      Top             =   3500
      Width           =   3000
      Begin VB.CommandButton cmdRetrieveSt 
         Caption         =   "Retrieve Statistics"
         Height          =   435
         Left            =   100
         TabIndex        =   21
         Top             =   870
         Width           =   2775
      End
      Begin VB.TextBox txtRetrieveSt 
         Height          =   285
         Left            =   100
         TabIndex        =   20
         Top             =   530
         Width           =   2775
      End
      Begin VB.Label Label11 
         Caption         =   "RetrieveStatistics parameter"
         Height          =   255
         Left            =   100
         TabIndex        =   23
         Top             =   300
         Width           =   2775
      End
   End
   Begin VB.CommandButton cmdExit 
      Caption         =   "Close"
      Height          =   345
      Left            =   4830
      TabIndex        =   22
      Top             =   105
      Width           =   1200
   End
   Begin VB.TextBox Text9 
      Height          =   270
      Left            =   1575
      TabIndex        =   18
      Top             =   3120
      Width           =   4425
   End
   Begin VB.TextBox Text8 
      Height          =   270
      Left            =   1575
      TabIndex        =   16
      Top             =   2835
      Width           =   4425
   End
   Begin VB.TextBox Text7 
      Height          =   270
      Left            =   1575
      TabIndex        =   14
      Top             =   2520
      Width           =   4425
   End
   Begin VB.TextBox Text6 
      Height          =   270
      Left            =   1575
      TabIndex        =   12
      Top             =   2205
      Width           =   4425
   End
   Begin VB.TextBox Text5 
      Height          =   270
      Left            =   1575
      TabIndex        =   10
      Top             =   1890
      Width           =   2850
   End
   Begin VB.TextBox Text4 
      Height          =   270
      Left            =   1575
      TabIndex        =   8
      Top             =   1575
      Width           =   2850
   End
   Begin VB.TextBox Text3 
      Height          =   270
      Left            =   1575
      TabIndex        =   6
      Top             =   1260
      Width           =   2850
   End
   Begin VB.TextBox Text2 
      Height          =   270
      Left            =   1575
      TabIndex        =   4
      Top             =   945
      Width           =   2850
   End
   Begin VB.TextBox Text1 
      Height          =   270
      Left            =   1575
      TabIndex        =   2
      Top             =   630
      Width           =   2850
   End
   Begin OposMSR_CCOCtl.OPOSMSR OPOSMSR1 
      Left            =   5040
      OleObjectBlob   =   "sMSR4.frx":0000
      Top             =   720
   End
   Begin VB.Label Label10 
      Caption         =   "Please swipe a card."
      Height          =   225
      Left            =   210
      TabIndex        =   0
      Top             =   210
      Width           =   3375
   End
   Begin VB.Label Label9 
      Alignment       =   1  'Right Justify
      Caption         =   "Track4"
      Height          =   225
      Left            =   105
      TabIndex        =   17
      Top             =   3150
      Width           =   1380
   End
   Begin VB.Label Label8 
      Alignment       =   1  'Right Justify
      Caption         =   "Track3"
      Height          =   225
      Left            =   105
      TabIndex        =   15
      Top             =   2835
      Width           =   1380
   End
   Begin VB.Label Label7 
      Alignment       =   1  'Right Justify
      Caption         =   "Track2"
      Height          =   225
      Left            =   105
      TabIndex        =   13
      Top             =   2520
      Width           =   1380
   End
   Begin VB.Label Label6 
      Alignment       =   1  'Right Justify
      Caption         =   "Track1"
      Height          =   225
      Left            =   105
      TabIndex        =   11
      Top             =   2205
      Width           =   1380
   End
   Begin VB.Label Label5 
      Alignment       =   1  'Right Justify
      Caption         =   "Middle initials"
      Height          =   225
      Left            =   105
      TabIndex        =   9
      Top             =   1890
      Width           =   1380
   End
   Begin VB.Label Label4 
      Alignment       =   1  'Right Justify
      Caption         =   "Surname"
      Height          =   225
      Left            =   105
      TabIndex        =   7
      Top             =   1575
      Width           =   1380
   End
   Begin VB.Label Label3 
      Alignment       =   1  'Right Justify
      Caption         =   "First Name"
      Height          =   225
      Left            =   105
      TabIndex        =   5
      Top             =   1260
      Width           =   1380
   End
   Begin VB.Label Label2 
      Alignment       =   1  'Right Justify
      Caption         =   "Expiration date"
      Height          =   225
      Left            =   105
      TabIndex        =   3
      Top             =   945
      Width           =   1380
   End
   Begin VB.Label Label1 
      Alignment       =   1  'Right Justify
      Caption         =   "Account number"
      Height          =   225
      Left            =   105
      TabIndex        =   1
      Top             =   630
      Width           =   1380
   End
End
Attribute VB_Name = "Step4"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
' Step 4  Device Statistics.

Option Explicit

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
    With OPOSMSR1
        'Obtains the statistics of the device.
        .RetrieveStatistics strParam
        If (.ResultCode <> OPOS_SUCCESS) Then
            strErrMsg = "RetrieveStatistics method error." + vbCrLf + vbCrLf
            strErrMsg = strErrMsg + "ResultCode = " + CStr(.ResultCode) + vbCrLf
            strErrMsg = strErrMsg + "ResultCodeExtended = " + CStr(.ResultCodeExtended)
            MsgBox strErrMsg, vbOKOnly + vbExclamation, "MSR"
            Exit Sub
        End If
    End With
    
    strXMLPath = App.Path + "\Sample.xml"
    'Delete XML file.
    strFindXMLPath = Dir(strXMLPath)
    If strFindXMLPath <> "" Then
        Kill (strXMLPath)
    End If
    'Create XML file.
    Open strXMLPath For Binary Access Write As #1
        Put #1, , strParam
    Close #1
    
    ' Opens another window and indicates the information of the XML file.
    Step4Browser.Show

End Sub

Private Sub Form_Load()

    With OPOSMSR1
        .Open "Unit1"
        ' Error check
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "This device has not been registered, or cannot use."
            GoTo LoadError
        End If
        
        .ClaimDevice 1000
        ' Error check
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to get the exclusive right for the device."
            GoTo LoadError
        End If
        
        .DeviceEnabled = True
        ' Error check
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Now the device is disable to use."
            GoTo LoadError
        End If
        
        .DataEventEnabled = True
        .ParseDecodeData = True
        
        ' Set the edit box of parameter input.
        txtRetrieveSt.Text = "ModelName,HoursPoweredCount,GoodReadCount"
        
        ' Checks whether it has function to obtain
        ' the statistics of devices.
        ' If it does not have the function, invalidates
        ' the [Retrieve Statistics] button and the edit box
        ' of parameter input.
        If .CapStatisticsReporting = False Then
            cmdRetrieveSt.Enabled = False
            txtRetrieveSt.Enabled = False
        End If
        
    End With

    Exit Sub

LoadError:
' Nothing can be used.
    Dim OBJ As Object
    'All objects on the form
    For Each OBJ In Me
        'Invalid exept for OPOS OCX
        If OBJ.Name <> "OPOSMSR1" Then
            OBJ.Enabled = False
        End If
    Next
    cmdExit.Enabled = True              'Only the exit button is enabled.

End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSMSR1
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    End With

End Sub

Private Sub OPOSMSR1_DataEvent(ByVal Status As Long)

    Dim lYear As Long
    Dim sExp As String
    Dim sDate As String

    With OPOSMSR1
        Text1.Text = .AccountNumber     '(Account No.)
    '*** Get the current date. If the invalid date, display it.
        sExp = .ExpirationDate
        lYear = Val(Mid(sExp, 3))
        If lYear < 80 Then              ' Under 80
            lYear = lYear + 2000            ' Consider it as after 2000
        Else                            ' Over 80
            lYear = lYear + 1900            ' Consider it as in 19s.
        End If
        'Make the strings as "yyyymm"
        sDate = Format(lYear, "0000") + Left(sExp, 2)
        'Conparing with the current date
        If Val(Format(Date, "yyyymm")) > Val(sDate) Then
            sExp = sExp + " (Invalid)"
        End If
        Text2.Text = sExp               '(Valid date)
        
        Text3.Text = .FirstName         '(First Name)
        Text4.Text = .Surname           '(Family Name)
        Text5.Text = .MiddleInitial     '(Middle Initial)
        Text6.Text = .Track1Data
        Text7.Text = .Track2Data
        Text8.Text = .Track3Data
        Text9.Text = .Track4Data
        
        .DataEventEnabled = True
    End With

End Sub

